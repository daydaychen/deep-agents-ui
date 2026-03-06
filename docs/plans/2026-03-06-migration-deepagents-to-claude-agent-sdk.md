---
title: "Migration Plan: deepagents → Claude Agent SDK (Route B)"
type: refactor
status: completed
date: 2026-03-06
---

# Migration Plan: deepagents → Claude Agent SDK (Route B)

## Enhancement Summary

**Deepened on:** 2026-03-06
**Sections enhanced:** 12
**Research sources:** Claude Agent SDK Context7 docs, SSE best practices, 9 parallel review agents (architecture, security, performance, agent-native, spec-flow, TypeScript, pattern-recognition, code-simplicity, learnings)

### Critical Corrections from Research
1. `query()` 签名错误：SDK 使用 `query({ prompt, options })` 而非 `query(message, options)`
2. SSE 流必须用 `pull`-based ReadableStream，不能用 `start`-based eager loop
3. `bypassPermissions` + 无认证 = 远程代码执行链（CRITICAL 安全漏洞）
4. 每次 `query()` 调用生成子进程，50-80MB RAM/session，与 serverless 不兼容
5. 模型注册表不匹配：当前系统用 Qwen/GLM，SDK 子代理仅支持 `sonnet|opus|haiku|inherit`
6. 前端重写范围被低估：实际需 1500+ 行而非 630 行
7. 保留 "threads" 术语和 "useChat" hook 名称，不引入新术语

### Key Improvements Added
1. 认证中间件 + Zod 输入验证（所有 API routes）
2. 基于 `canUseTool` + `allowedTools`/`disallowedTools` 的权限策略（替代 bypassPermissions）
3. Session 生命周期管理器（并发限制、orphan 检测、内存监控）
4. SSE 心跳、事件 ID、重连机制
5. TextDecoder chunk 边界缓冲
6. 详细的 SDKMessage → UI Message 映射表（20+ 消息类型）
7. Phase 1 拆分为 3 个子阶段，降低风险

---

## Context

DataBus Pilot 当前使用 deepagents (Python) + LangGraph API 作为 agent 后端，deep-agents-ui (Next.js) 作为前端。架构存在以下问题：
- VFS 层是冗余的 HTTP 代理抽象，MCP 工具已完全覆盖相同功能
- deepagents 中间件栈复杂（8 层），维护成本高
- 上下文工程能力受限于底层框架

目标：将 agent 后端迁移到 Claude Agent SDK (TypeScript)，直接集成到 deep-agents-ui 的 Next.js API routes 中，形成单一部署单元。通过 `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` 接入自定义推理接口。

### Research Insights: Architecture

**关键约束（来自 SDK 文档）：**
- `query()` 每次调用会 spawn 一个子进程执行 agent loop，进程完成后退出
- 每个子进程约 50-80MB RAM，需要进程生命周期管理
- SDK 本质上是 CLI 工具的程序化接口，NOT a lightweight library
- 与 serverless (Vercel Functions) 不兼容 — 必须使用长时运行的 Node.js 服务器
- `resume` 选项依赖磁盘上的 session 数据，容器化部署需持久卷

**部署模型：**
```
❌ Vercel Serverless Functions (10s/60s timeout, no persistent state)
❌ Vercel Edge Functions (no subprocess spawn)
✅ 自托管 Node.js 服务器 (Docker + persistent volume)
✅ VPS / 云主机 (最简单)
```

---

## 分三阶段执行

### Phase 1A: 基础设施 — SDK 集成 + API Route 骨架

**在 deep-agents-ui 仓库中添加 API routes，包装 Claude Agent SDK。**

#### 1A.1 安装依赖

```bash
yarn add @anthropic-ai/claude-agent-sdk zod
```

#### 1A.2 环境变量配置

```env
# .env.local
ANTHROPIC_BASE_URL=https://your-inference-endpoint.com
ANTHROPIC_AUTH_TOKEN=your-api-key
ANTHROPIC_MODEL=your-model-name

# MCP servers
DATABUS_MCP_URL=http://127.0.0.1:10103/mcp
DATABUS_API_KEY=your-databus-key
PLAYWRIGHT_MCP_URL=http://127.0.0.1:3232/mcp

# Session 管理
SESSION_DIR=/data/sessions           # 持久化 session 目录
MAX_CONCURRENT_SESSIONS=5            # 并发 session 数限制
SESSION_TTL_HOURS=24                 # Session 过期时间

# 认证（Phase 1A 新增）
API_SECRET_KEY=your-secret-key       # API 认证密钥
```

> **Research Insight:** SDK 通过环境变量 `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_MODEL` 自动配置。也支持 `ANTHROPIC_DEFAULT_SONNET_MODEL`、`ANTHROPIC_DEFAULT_OPUS_MODEL`、`ANTHROPIC_DEFAULT_HAIKU_MODEL` 为子代理指定不同模型。

#### 1A.3 API Route 设计

```
app/api/
├── chat/
│   ├── route.ts              # POST: 新建对话 (SSE streaming)
│   └── [threadId]/
│       ├── route.ts          # POST: 续接对话 (SSE streaming)
│       ├── resume/route.ts   # POST: 从中断恢复
│       └── stop/route.ts     # POST: 中止执行
├── threads/
│   ├── route.ts              # GET: 列出会话
│   └── [threadId]/route.ts   # GET: 会话详情, DELETE: 删除
└── config/
    └── route.ts              # GET: 返回支持的模型/agent列表
```

> **Research Insight: 术语一致性** — 保留现有 UI 的 "threads" 术语（Thread 类型已定义在 types.ts 中），不引入 "sessions"。API routes 使用 `[threadId]` 而非 `[sessionId]`。SDK 内部的 `sessionId` 映射到 UI 的 `threadId`。

#### 1A.4 认证中间件

```typescript
// lib/auth.ts
import { NextRequest, NextResponse } from 'next/server'

export function withAuth(
  handler: (req: NextRequest) => Promise<Response>
): (req: NextRequest) => Promise<Response> {
  return async (req) => {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    if (token !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return handler(req)
  }
}
```

> **Security Insight (CRITICAL):** 原计划使用 `bypassPermissions: true` + `allowDangerouslySkipPermissions: true` 且无 API 认证，构成远程代码执行链（RCE）。任何能访问 HTTP 端点的人可以通过 agent 执行任意代码。**必须**添加认证层。

#### 1A.5 输入验证

```typescript
// lib/validation.ts
import { z } from 'zod'

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(50000),
  threadId: z.string().uuid().optional(),
  config: z.object({
    maxTurns: z.number().int().min(1).max(200).optional(),
    model: z.string().optional(),
  }).optional(),
})

export const resumeRequestSchema = z.object({
  response: z.unknown(),  // interrupt response payload
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
```

#### 1A.6 核心 SDK 封装

新建 `lib/agent/` 目录：

```
lib/agent/
├── index.ts                  # query() 封装 + SSE 序列化
├── config.ts                 # MCP servers, agents, permissions 配置
├── agents.ts                 # 子代理定义 (AgentDefinition)
├── session-manager.ts        # Session 生命周期管理
├── prompts/
│   └── CLAUDE.md             # 主代理系统提示（从 main.md 迁移）
└── skills/                   # SKILL.md 文件（从 databus-pilot-new 迁移）
    ├── create-task/SKILL.md
    ├── use-template/SKILL.md
    ├── hook-dev/SKILL.md
    ├── test-iterate/SKILL.md
    └── analyst/              # 分析师技能
        ├── website-analysis-workflow/SKILL.md
        ├── browser-dom-analyzer/SKILL.md
        └── ...
```

**`lib/agent/config.ts`** — SDK 配置：

```typescript
import { query, type Options } from '@anthropic-ai/claude-agent-sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getSubagentDefinitions } from './agents'

function loadClaudeMd(): string {
  return readFileSync(join(__dirname, 'prompts/CLAUDE.md'), 'utf-8')
}

export function getAgentOptions(overrides?: Partial<Options>): Options {
  return {
    model: process.env.ANTHROPIC_MODEL,
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append: loadClaudeMd(),
    },
    permissionMode: 'allowedTools',      // ← 替代 bypassPermissions
    allowedTools: [                       // ← 白名单模式
      'mcp__databus__*',                  // databus MCP 所有工具
      'mcp__playwright__*',               // playwright MCP 所有工具
      'Agent',                            // 子代理调用
      'TodoWrite',                        // Todo 管理
      'Read', 'Glob', 'Grep',            // 只读文件操作
    ],
    disallowedTools: [
      'Bash',                             // 禁止 shell 执行
      'Edit', 'Write',                    // 禁止文件写入
    ],
    maxTurns: overrides?.maxTurns ?? 100,
    includePartialMessages: true,
    mcpServers: {
      databus: {
        type: 'http',
        url: process.env.DATABUS_MCP_URL!,
        headers: { Authorization: `Bearer ${process.env.DATABUS_API_KEY}` },
      },
      playwright: {
        type: 'http',
        url: process.env.PLAYWRIGHT_MCP_URL!,
      },
    },
    agents: getSubagentDefinitions(),
    ...overrides,
  }
}
```

> **Security Insight:** 使用 `permissionMode: 'allowedTools'` + 白名单代替 `bypassPermissions`。这样 agent 只能调用显式允许的工具，无法执行 Bash 命令或写入文件系统。
>
> **SDK 文档确认:** `allowedTools` 支持通配符模式 `mcp__server__*`，可以匹配 MCP server 下的所有工具。`disallowedTools` 优先级高于 `allowedTools`。

**`lib/agent/session-manager.ts`** — Session 生命周期管理：

```typescript
// Session 并发控制 + 孤儿检测 + 内存监控
interface ActiveSession {
  threadId: string
  abortController: AbortController
  startedAt: Date
  pid?: number  // query() 子进程 PID
}

class SessionManager {
  private active = new Map<string, ActiveSession>()
  private maxConcurrent: number

  constructor() {
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SESSIONS ?? '5')
  }

  canStart(): boolean {
    return this.active.size < this.maxConcurrent
  }

  register(threadId: string, abort: AbortController): void {
    this.active.set(threadId, {
      threadId, abortController: abort, startedAt: new Date()
    })
  }

  unregister(threadId: string): void {
    this.active.delete(threadId)
  }

  stop(threadId: string): boolean {
    const session = this.active.get(threadId)
    if (!session) return false
    session.abortController.abort()
    this.active.delete(threadId)
    return true
  }

  getActive(): ActiveSession[] {
    return Array.from(this.active.values())
  }
}

export const sessionManager = new SessionManager()
```

> **Performance Insight:** 每次 `query()` spawn 子进程，约 50-80MB RAM。5 并发 session = 250-400MB。必须限制并发数并监控内存。

---

### Phase 1B: 子代理 + 系统提示 + Skills

**`lib/agent/agents.ts`** — 子代理定义：

从 `databus-pilot-new/src/databus_pilot/prompts/subagent/` 迁移 3 个活跃子代理：

| 原文件 | AgentDefinition name | 职责 |
|--------|---------------------|------|
| `analyst.md` | `analyst` | 网站结构分析、XPath/JSONPath 生成 |
| `databus_specialist.md` | `databus_specialist` | 任务创建、Hook 开发、模板应用 |
| `config_validator.md` | `config_validator` | 配置测试、诊断、根因分析 |

```typescript
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

function loadPromptFile(name: string): string {
  return readFileSync(
    join(__dirname, `../../src/databus_pilot/prompts/subagent/${name}.md`),
    'utf-8'
  ).replace(/^---[\s\S]*?---\n/, '')  // strip YAML frontmatter
}

export function getSubagentDefinitions(): Record<string, AgentDefinition> {
  return {
    analyst: {
      description: '网站结构分析专家，负责 XPath/JSONPath 生成和爬取策略制定',
      prompt: loadPromptFile('analyst'),
      model: 'inherit',
      mcpServers: ['playwright'],
      skills: [
        'website-analysis-workflow',
        'browser-dom-analyzer',
        'element-extractor',
        'network-request-analyzer',
        'js-reverse-engineer',
        'xpath-validator',
        'jsonpath-validator',
        'scraping-strategist',
      ],
      maxTurns: 50,
    },
    databus_specialist: {
      description: '任务配置专家，负责创建任务、编写 Hook、应用模板',
      prompt: loadPromptFile('databus_specialist'),
      model: 'inherit',
      mcpServers: ['databus'],
      skills: ['create-task', 'use-template', 'hook-dev'],
      maxTurns: 30,
    },
    config_validator: {
      description: '配置验证专家，负责测试和诊断任务配置问题',
      prompt: loadPromptFile('config_validator'),
      model: 'inherit',
      mcpServers: ['databus'],
      skills: ['test-iterate'],
      maxTurns: 15,
    },
  }
}
```

> **Research Insight: model 字段** — SDK 的 `AgentDefinition.model` 仅支持 `'sonnet' | 'opus' | 'haiku' | 'inherit'`。由于我们通过 `ANTHROPIC_BASE_URL` 接入自定义推理端点，所有子代理应使用 `'inherit'`（继承主模型）。如需不同模型可通过环境变量 `ANTHROPIC_DEFAULT_SONNET_MODEL` 等控制。
>
> **Learnings Applied: skill-first 架构** — 从 databus-pilot-new 的 learnings 中，子代理 prompt 应保持精简（<600 tokens），具体技能通过 SKILL.md 在运行时加载。这与 SDK 的 `skills` 字段完全匹配。
>
> **Learnings Applied: skill_hint 路由** — config_validator 完成后通过 prompt 级逻辑引导主代理路由到 databus_specialist，这在 SDK 中通过系统提示中的路由规则实现（无需代码层支持）。
>
> **Learnings Applied: 工具排除** — 原系统的 `"name:!hook_delete"` 模式在 SDK 中通过 `disallowedTools: ['mcp__databus__hook_delete']` 实现。

#### 1B.2 系统提示迁移

从 `databus-pilot-new/src/databus_pilot/prompts/main.md` 提取 Markdown body（~338 行），转换为 `CLAUDE.md`。

关键调整：
- 移除 deepagents 特有的中间件指令（VFS 路径、filesystem tools 引用）
- 保留核心工作流逻辑（5 个 workflow、子代理路由规则、错误检测）
- 将 `write_todos` 引用改为 Claude SDK 的 TodoWrite
- 将 MCP 工具引用保持不变（task_create, hook_create 等已在 databus MCP server 中）
- 将 `/memories/` 路径引用替换为 Claude SDK 的 memory 机制

> **Research Insight:** SDK 的 `systemPrompt` 支持两种模式：
> - `{ type: 'preset', preset: 'claude_code', append: '...' }` — 使用 Claude Code 预设 + 追加内容
> - `{ type: 'raw', content: '...' }` — 完全自定义
>
> 推荐使用 `preset: 'claude_code'` + `append`，因为预设包含工具使用规范、安全指令等基础内容，只需 append 业务特定的工作流指令。

#### 1B.3 Skills 迁移

直接复制 SKILL.md 文件到 `lib/agent/skills/`：

**优先迁移（Phase 1B 必需）**：
- `skills/mcp/create-task/SKILL.md`
- `skills/mcp/use-template/SKILL.md`
- `skills/mcp/hook-dev/SKILL.md`
- `skills/mcp/test-iterate/SKILL.md`

**Phase 1C 补充**：
- `skills/analyst/` 目录下 8 个分析师技能

SKILL.md 格式与 Claude Agent SDK 的 skills 系统兼容，基本无需修改。

> **SDK 文档确认:** Skills 通过目录中的 `SKILL.md` 文件自动发现。SDK 在 agent 启动时扫描 `skills` 配置指定的路径，将 SKILL.md 内容注入到 agent 的系统提示中。

---

### Phase 1C: SSE 流式 API + 端到端验证

#### 1C.1 SSE 流式 API Route

**`app/api/chat/route.ts`** — 核心对话端点：

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'
import { NextRequest } from 'next/server'
import { getAgentOptions } from '@/lib/agent/config'
import { chatRequestSchema } from '@/lib/validation'
import { withAuth } from '@/lib/auth'
import { sessionManager } from '@/lib/agent/session-manager'

// 必须：Node.js runtime（非 Edge，因为 query() spawn 子进程）
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300  // 5 分钟超时

async function handler(req: NextRequest) {
  // 1. 输入验证
  const body = await req.json()
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const { message, threadId, config } = parsed.data

  // 2. 并发限制
  if (!sessionManager.canStart()) {
    return new Response(JSON.stringify({ error: 'Too many concurrent sessions' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. 构建 SDK options
  const abortController = new AbortController()
  const effectiveThreadId = threadId ?? crypto.randomUUID()

  const options = getAgentOptions({
    sessionId: effectiveThreadId,
    resume: threadId ? true : undefined,
    maxTurns: config?.maxTurns,
  })

  // 4. 注册 session
  sessionManager.register(effectiveThreadId, abortController)

  // 5. 关键修正：query() 签名是 { prompt, options }
  const result = query({
    prompt: message,
    options,
    signal: abortController.signal,
  })

  // 6. 关键修正：pull-based ReadableStream
  const encoder = new TextEncoder()
  let eventId = 0
  const iterator = result[Symbol.asyncIterator]()

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next()
        if (done) {
          // 发送结束事件
          controller.enqueue(
            encoder.encode(`event: done\ndata: {}\n\n`)
          )
          controller.close()
          sessionManager.unregister(effectiveThreadId)
          return
        }
        // SSE 格式：包含 event type + id + data
        const eventType = value.type ?? 'message'
        controller.enqueue(
          encoder.encode(
            `event: ${eventType}\nid: ${++eventId}\ndata: ${JSON.stringify(value)}\n\n`
          )
        )
      } catch (error) {
        if (abortController.signal.aborted) {
          controller.enqueue(
            encoder.encode(`event: aborted\ndata: {}\n\n`)
          )
        } else {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`
            )
          )
        }
        controller.close()
        sessionManager.unregister(effectiveThreadId)
      }
    },
    cancel() {
      abortController.abort()
      sessionManager.unregister(effectiveThreadId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',         // Nginx proxy 禁用缓冲
      'X-Thread-Id': effectiveThreadId,    // 返回 threadId 给客户端
    },
  })
}

export const POST = withAuth(handler)
```

> **Critical Fix: query() 签名** — SDK 文档确认 `query()` 接受 `{ prompt, options }` 对象，而非 `(message, options)` 位置参数。
>
> **Critical Fix: pull-based SSE** — 原计划的 `start()` 中 eager loop 会阻塞 Response 传递（`new Response(stream)` 在 `start()` 完成前无法返回给客户端）。改用 `pull()` 模式：框架在客户端消费数据后才请求下一个 chunk，天然支持背压。
>
> **Critical Fix: SSE 格式** — 添加 `event:` 字段（消息类型路由）、`id:` 字段（客户端重连恢复）。
>
> **Performance Insight:** 添加 `X-Accel-Buffering: no` header，防止 Nginx 反代缓冲 SSE 事件。

#### 1C.2 停止端点

**`app/api/chat/[threadId]/stop/route.ts`**：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { sessionManager } from '@/lib/agent/session-manager'

async function handler(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params
  const stopped = sessionManager.stop(threadId)
  if (!stopped) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

export const POST = withAuth(handler)
```

---

### Phase 2: 前端 UI 适配

**替换 LangGraph SDK 依赖，对接新的 API routes。**

#### 2.1 移除 LangGraph 依赖

```bash
yarn remove @langchain/core @langchain/langgraph @langchain/langgraph-sdk
```

#### 2.2 重写 useChat hook

保留 `useChat` 名称（不改为 `useAgentChat`），保持现有 API 契约。替换内部实现：

| 原 Hook | 新实现 | 说明 |
|---------|--------|------|
| `useChat.ts` → `useStream()` | `useChat.ts`（重写内部） | 用 fetch SSE 对接 `/api/chat` |
| `useThreads.ts` → `client.threads.*` | `useThreads.ts`（改数据源） | 对接 `/api/threads` |
| `useMemory.ts` → `client.store.*` | 暂不实现 | Phase 3 或移除 |
| `usePersistedMessages.ts` | 保留 IndexedDB 层 | 子代理消息持久化逻辑可复用 |

**`useChat.ts` 核心重写逻辑**：

```typescript
import { useState, useRef, useCallback } from 'react'

// SSE chunk 边界缓冲
function createSSEParser() {
  let buffer = ''

  return function parse(chunk: string): Array<{ event?: string; data: string }> {
    buffer += chunk
    const events: Array<{ event?: string; data: string }> = []
    const parts = buffer.split('\n\n')

    // 最后一段可能不完整，保留在 buffer 中
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      if (!part.trim()) continue
      let event: string | undefined
      let data = ''
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7)
        else if (line.startsWith('data: ')) data += line.slice(6)
        else if (line.startsWith('id: ')) { /* 可用于重连 */ }
      }
      if (data) events.push({ event, data })
    }
    return events
  }
}

function useChat() {
  const [messages, setMessages] = useState<SDKMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (
    content: string,
    threadId?: string
  ) => {
    setIsStreaming(true)
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({ message: content, threadId }),
        signal: abort.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      // 从响应头获取 threadId
      const newThreadId = response.headers.get('X-Thread-Id')

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      const parse = createSSEParser()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const events = parse(chunk)

        for (const { event, data } of events) {
          if (event === 'done' || event === 'aborted') break
          if (event === 'error') {
            const err = JSON.parse(data)
            throw new Error(err.error)
          }
          const msg: SDKMessage = JSON.parse(data)
          setMessages(prev => processSDKMessage(prev, msg))
        }
      }
    } catch (error) {
      if (abort.signal.aborted) return  // 用户主动中止，不报错
      throw error
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, isStreaming, sendMessage, stopStream, /* ... */ }
}
```

> **Critical Fix: TextDecoder chunk 边界** — 原计划直接 `split('\n')` 解析 SSE，但 TCP chunk 可能在 SSE 事件中间断开（一个事件被拆到两个 chunk）。使用 buffer-based SSE parser 解决。
>
> **Critical Fix: 错误处理** — 添加 try/catch/finally，确保 `isStreaming` 状态在异常时也能重置。区分用户主动中止（不报错）和其他错误。
>
> **Research Insight: AbortController 清理** — 在 `finally` 中清理 `abortRef`，防止组件卸载后的 stale reference。

#### 2.3 SDKMessage → UI 消息映射

Claude Agent SDK 输出 20+ 种 SDKMessage 类型，需要映射到 UI 展示：

| SDKMessage type | UI 行为 | 优先级 |
|----------------|---------|--------|
| `SDKUserMessage` | 渲染用户消息气泡 | P0 |
| `SDKAssistantMessage` | 渲染 AI 回复（含 text + tool_use blocks） | P0 |
| `SDKPartialAssistantMessage` | 流式更新当前 AI 回复 | P0 |
| `SDKResultMessage` | 最终结果（含 session 元数据） | P0 |
| `SDKToolUseBlock` (in assistant content) | 工具调用展示（ToolCallBox） | P0 |
| `SDKToolResultBlock` | 工具调用结果（折叠展示） | P0 |
| `SDKStatusMessage` | 状态栏更新（"Thinking..."、"Using tool..."） | P1 |
| `SDKSubagentStartMessage` | 子代理面板：新建子代理条目 | P1 |
| `SDKSubagentStopMessage` | 子代理面板：标记完成 | P1 |
| `SDKCompactBoundaryMessage` | 忽略（SDK 内部上下文压缩标记） | - |
| `SDKHookStartedMessage` | 忽略（SDK hooks 相关） | - |
| `SDKSystemMessage` | 隐藏或以系统提示展示 | P2 |

**processSDKMessage 函数关键逻辑**：

```typescript
function processSDKMessage(
  prev: UIMessage[],
  msg: SDKMessage
): UIMessage[] {
  switch (msg.type) {
    case 'assistant': {
      // 提取 text blocks 和 tool_use blocks
      const textContent = msg.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
      const toolCalls = msg.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({
          id: b.id,
          name: b.name,
          args: b.input,
          status: 'pending' as const,
        }))
      return [...prev, { role: 'assistant', content: textContent, toolCalls }]
    }
    case 'partial_assistant': {
      // 更新最后一条 assistant 消息（流式追加）
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last?.role === 'assistant') {
        last.content = extractPartialText(msg)
      }
      return updated
    }
    // ... 其他类型
  }
}
```

> **Agent-Native Insight: 7/18 能力缺失** — 以下 UI 功能在 SDK 中没有直接对应，需要 workaround：
>
> | 功能 | 现状 | Workaround |
> |------|------|------------|
> | `editMessage` | SDK 无消息编辑 API | 使用 `forkSession` + 从指定点重放 |
> | `retryFromMessage` | SDK 无重试 API | 使用 `resumeSessionAt` 从检查点重试 |
> | `runSingleStep` | SDK 无单步执行 | 设 `maxTurns: 1` 模拟 |
> | `setBranch` | SDK 的分支 = `forkSession` | 需维护 branch→sessionId 映射 |
> | `setOverrideConfig` | SDK 无运行时配置覆盖 | 在 query() 调用时传入 options |
> | `setFiles` | SDK 无文件上传 API | 通过 MCP 工具或 prompt 传递 |
> | `markCurrentThreadAsResolved` | SDK 无状态标记 | 在应用层（IndexedDB）维护 |

#### 2.4 功能映射（修正版）

| 当前 UI 功能 | Claude Agent SDK 对应 | Phase 2 优先级 | 备注 |
|-------------|----------------------|---------------|------|
| 流式对话 | `includePartialMessages` → SSE | P0 | `SDKPartialAssistantMessage` |
| 会话列表 | `listSessions()` → `/api/threads` | P0 | 保留 "threads" 命名 |
| 续接会话 | `resume: true` + `sessionId` | P0 | |
| 中断/停止 | `AbortController.abort()` | P0 | 通过 `/api/chat/[id]/stop` |
| 工具审批 | `canUseTool` callback | P1 | 见下方详细设计 |
| 子代理展示 | `SDKSubagentStart/StopMessage` | P1 | |
| Todo 面板 | 从 `TodoWrite` tool_use events 解析 | P1 | |
| 分支/检查点 | `forkSession` + `resumeSessionAt` | P2 | |
| 消息编辑 | `forkSession` 重放 | P2 | |
| Memory Store | 暂不实现 | P3 | |

#### 2.5 工具审批详细设计

SDK 的 `canUseTool` 是同步回调，但 UI 审批是异步的。需要桥接：

```typescript
// 在 API route 中
const options = getAgentOptions({
  canUseTool: async (toolName, input, { signal }) => {
    // 1. 检查白名单（自动放行）
    if (isAutoApproved(toolName)) {
      return { behavior: 'allow' }
    }
    // 2. 需要人工审批的工具
    // 发送 SSE 事件通知前端
    pendingApprovals.set(toolName, { resolve: null })

    // 3. 等待前端通过 /api/chat/[id]/resume POST 回传决策
    const decision = await waitForApproval(threadId, toolName, signal)

    return decision.approved
      ? { behavior: 'allow' }
      : { behavior: 'deny', message: decision.reason }
  },
})
```

> **Research Insight:** `canUseTool` 签名：`(toolName: string, input: Record<string, unknown>, context: { signal: AbortSignal, suggestions: string[], toolUseID: string, agentID: string }) => Promise<{ behavior: 'allow' | 'deny', message?: string }>`

#### 2.6 UI 组件适配

大部分 UI 组件（ChatMessage, ToolCallBox, SubAgentSection 等）只需要适配数据源格式，渲染逻辑基本可复用。

需要重写的核心组件：
- `ChatProvider.tsx` — 替换 context 源（保留 split context 模式）
- `ChatInterface.tsx` — 替换 stream 交互逻辑
- `ConfigDialog.tsx` — 移除 LangGraph 配置，改为模型/endpoint 配置
- `ToolApprovalInterrupt.tsx` — 适配 `canUseTool` 格式

可复用的组件：
- `ChatMessage.tsx` — 消息渲染（改数据源接口）
- `ToolCallBox.tsx` — 工具调用展示
- `SubAgentPanel.tsx` — 子代理面板
- `ThreadList.tsx` — 保留名称，改数据源
- `TasksSection.tsx` — Todo 展示

> **Pattern Insight: Split Context 保留** — 现有的 `ChatStateContext`（频繁变化）/ `ChatActionsContext`（基本稳定）拆分模式是良好的性能优化，应在重写中保留。

---

## 删除清单

**databus-pilot-new 中可删除的代码**（迁移完成后）：

| 目录/文件 | 行数 | 说明 |
|----------|------|------|
| `middleware/vfs_backend.py` | ~318 | VFS HTTP 代理 |
| `middleware/filesystem.py` | ~193 | VFS 中间件 |
| `middleware/reminder_provider/` | ~500+ | 提醒器系统 |
| `loader/graph_loader.py` | ~200 | 图构建器 |
| `loader/middleware_loader.py` | ~180 | 中间件加载 |
| `loader/graph.py` | ~150 | deepagents 图创建 |
| `prompts/` | ~2500+ | YAML/MD 配置（迁移后） |
| `knowledge/` | ~300+ | RAG 知识库 |
| `entry.py` | ~50 | LangGraph 入口 |
| `config.py` (部分) | ~200 | LLM 注册表（不再需要） |

**deep-agents-ui 中可删除的依赖**：
- `@langchain/core`
- `@langchain/langgraph`
- `@langchain/langgraph-sdk`

---

## 实施顺序（修正版）

```
Week 1: Phase 1A (基础设施) — 验证核心可行性
  ├─ Day 1: SDK 安装 + 环境变量 + 认证中间件 + 输入验证
  ├─ Day 2: Session Manager + 最小 SSE API route
  └─ Day 3: curl 端到端验证（发送消息 → 收到 SSE 流 → 停止）
            ⚡ 验证点：确认 query() 子进程能正常 spawn 和通信

Week 1-2: Phase 1B (内容迁移)
  ├─ Day 4: CLAUDE.md 系统提示迁移
  ├─ Day 5: 子代理定义 (agents.ts)
  └─ Day 6: Skills 迁移 + MCP 连接验证
            ⚡ 验证点：agent 能调用 databus MCP 工具 + 委派子代理

Week 2: Phase 1C (流式完善)
  ├─ Day 7: SSE 事件格式完善（event type, id, heartbeat）
  └─ Day 8: 工具审批 canUseTool + 会话续接 resume
            ⚡ 验证点：完整对话流程 = 发消息→工具调用→审批→子代理→结果

Week 3: Phase 2 (前端) — 仅在 Phase 1 全部验证通过后开始
  ├─ Day 9-10:  useChat hook 重写 + SSE 解析
  ├─ Day 11:    ChatProvider + 消息格式映射
  ├─ Day 12:    ThreadList + 会话管理
  ├─ Day 13:    子代理展示 + Todo 面板
  └─ Day 14:    工具审批 UI + 集成测试
```

> **Architecture Insight:** 将 Phase 1 拆分为 1A/1B/1C，每个子阶段有明确的验证点。Phase 1A 验证核心可行性（SDK 子进程能否在 Next.js 中正常运行），如果此步失败则需重新评估架构。

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SDK 子进程与 Next.js 兼容性 | 阻塞全部 | Phase 1A Day 1 即验证；备选：独立 Node.js 服务 |
| 自定义推理端点兼容性 | 阻塞全部 | `ANTHROPIC_BASE_URL` 需兼容 Claude Messages API 格式 |
| 内存泄漏（子进程不释放） | 生产稳定性 | SessionManager + 进程监控 + 定时 reaper |
| SSE 连接中断（网络抖动） | 用户体验 | 客户端重连 + `Last-Event-ID` + 服务端 resume |
| Skills 格式不兼容 | 功能缺失 | Phase 1B 逐个验证 SKILL.md 加载 |
| 模型能力差异（Qwen→Claude） | 行为变化 | 系统提示需针对 Claude 特性调整 |

---

## 验证方式

1. **Phase 1A 基础验证**:
   ```bash
   curl -N -X POST http://localhost:3000/api/chat \
     -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer your-secret-key' \
     -d '{"message":"hello"}' --no-buffer
   ```
   期望：收到 SSE 事件流，包含 `event: assistant` 和 `event: done`

2. **MCP 连通性**: agent 输出中正确调用 `mcp__databus__*` 和 `mcp__playwright__*` 工具

3. **子代理触发**: 发送分析类任务，验证 `SDKSubagentStartMessage` 事件

4. **会话续接**: 中断对话后用 `threadId` resume，验证上下文保持

5. **前端集成**: UI 中完成完整任务创建流程（分析 → 创建 → 测试）

6. **负载测试**: 5 并发 session，验证 SessionManager 限制和内存使用

---

## Open Questions

1. **ANTHROPIC_BASE_URL 兼容性** — 自定义推理端点是否完全兼容 Claude Messages API 格式？SDK 的 tool_use、streaming 协议细节？
2. **SDK 版本稳定性** — `@anthropic-ai/claude-agent-sdk` 当前是否有 stable release？V2 Session API 是否应等待 stable？
3. **磁盘持久化** — Session 数据存储在哪个目录？Docker 部署时需要 volume mount 哪个路径？
4. **工具审批的延迟** — `canUseTool` 回调等待人工审批时，SDK 子进程会一直挂起吗？有超时机制吗？
