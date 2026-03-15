---
status: pending
priority: p2
issue_id: "008"
tags: [security, xss, i18n]
dependencies: []
---

# P2: XSS 风险 - 国际化字符串中的 HTML 注入

## Problem Statement

`ConfigDialog.tsx` 中使用 `t.rich()` 渲染助手名称时，没有对 `selectedAssistant.name` 进行 HTML 实体转义。如果攻击者能够控制助手名称（例如通过 LangGraph 后端），可以注入 XSS 载荷，当用户打开删除确认对话框时执行恶意脚本。

## Findings

**来源:** security-sentinel 审查报告

**文件位置:** `/Users/chentt/Github/deep-agents-ui/src/app/components/ConfigDialog.tsx` 第 524-537 行

**问题代码:**
```typescript
<DialogDescription>
  {t.rich("deleteAssistantDescription", {
    name:
      selectedAssistant.name ||
      selectedAssistant.graph_id,  // ⚠️ 未转义的用户数据
    strong: (chunks: any) => (
      <strong className="font-semibold text-foreground">
        {chunks}
      </strong>
    ),
  })}
</DialogDescription>
```

**风险分析:**
1. **不受信任的数据源**: `selectedAssistant.name` 来自 LangGraph SDK，可能被恶意注入
2. **rich 渲染**: `t.rich()` 允许渲染 HTML，如果助手名称包含 `<script>` 或其他恶意标签，可能被执行
3. **缺少转义**: 没有对助手名称进行 HTML 实体转义

**攻击场景:**
1. 攻击者创建名为 `<script>alert('XSS')</script>` 的助手
2. 用户打开删除确认对话框
3. 恶意脚本在用户浏览器中执行

**影响:**
- XSS 攻击可能窃取用户 session
- 可能执行任意 JavaScript 代码
- 可能重定向用户到恶意网站

## Proposed Solutions

### 方案 A: HTML 实体转义（推荐）

**实现:**
```typescript
// src/lib/utils.ts (新建或扩展现有)
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

// ConfigDialog.tsx 中使用
import { escapeHtml } from "@/lib/utils";

const safeAssistantName = escapeHtml(
  selectedAssistant.name || selectedAssistant.graph_id
);

<DialogDescription>
  {t.rich("deleteAssistantDescription", {
    name: safeAssistantName,
    strong: (chunks: React.ReactNode) => (
      <strong className="font-semibold text-foreground">
        {chunks}
      </strong>
    ),
  })}
</DialogDescription>
```

**Pros:**
- 完全防止 XSS 攻击
- 实现简单
- 可复用到其他地方

**Cons:**
- 需要创建工具函数
- 特殊字符会显示为实体（但这是期望行为）

**Effort:** Small (1 小时)

**Risk:** 低

---

### 方案 B: 使用纯文本渲染

**实现:**
```typescript
// 修改 i18n 键，不使用 rich 渲染
<DialogDescription>
  {t("deleteAssistantDescriptionPlain", {
    name: selectedAssistant.name || selectedAssistant.graph_id,
  })}
</DialogDescription>
```

```json
// messages/en.json
{
  "deleteAssistantDescriptionPlain": "Are you sure you want to delete assistant \"{name}\"? This action cannot be undone."
}
```

**Pros:**
- 简单直接
- 不需要额外工具函数
- next-intl 会自动转义

**Cons:**
- 失去粗体格式
- 需要添加新的翻译键

**Effort:** Small (30 分钟)

**Risk:** 低

---

### 方案 C: 使用 DOMPurify 清理

**实现:**
```typescript
import DOMPurify from 'dompurify';

const safeName = DOMPurify.sanitize(
  selectedAssistant.name || selectedAssistant.graph_id,
  { ALLOWED_TAGS: [] } // 不允许任何标签
);
```

**Pros:**
- 业界标准的 XSS 防护
- 可配置
- 处理边缘情况

**Cons:**
- 需要添加新依赖
- 对于简单场景可能过度设计

**Effort:** Small (1 小时)

**Risk:** 低

---

## Recommended Action

**推荐方案 A** - 创建 HTML 转义工具函数并在使用 `t.rich()` 时转义所有用户数据。这是最灵活且可复用的方案。

**实施步骤:**
1. 创建 `src/lib/utils.ts` 添加 `escapeHtml` 函数
2. 在 `ConfigDialog.tsx` 中转义助手名称
3. 审查其他使用 `t.rich()` 的地方
4. 添加测试用例验证 XSS 防护

---

## Acceptance Criteria

- [ ] 创建 `escapeHtml` 工具函数
- [ ] 在 `ConfigDialog.tsx` 中转义助手名称
- [ ] 测试 XSS 攻击场景（输入 `<script>alert('XSS')</script>` 应显示为纯文本）
- [ ] 审查其他使用 `t.rich()` 的组件
- [ ] 添加测试用例

---

## Technical Details

**Affected Files:**
- `/Users/chentt/Github/deep-agents-ui/src/app/components/ConfigDialog.tsx`
- `/Users/chentt/Github/deep-agents-ui/src/lib/utils.ts` (新建或扩展)

**Related Components:**
- `messages/en.json`、`messages/zh.json` - i18n 翻译

---

## Work Log

### 2026-03-15 - 初始发现

**By:** security-sentinel agent

**Actions:**
- 审查 ConfigDialog 的 i18n 使用
- 发现 XSS 风险
- 生成安全审计报告

**Learnings:**
- `t.rich()` 允许渲染 HTML，需要转义用户数据
- 来自后端的数据不应信任

---

## Resources

- OWASP XSS: https://owasp.org/www-community/attacks/xss/
- next-intl 文档：https://next-intl-docs.vercel.app/
- 安全审计报告：security-sentinel 审查结果
