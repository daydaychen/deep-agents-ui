---
status: pending
priority: p1
issue_id: "001"
tags: [security, authentication, rails]
dependencies: []
---

# P1: Auth Mode 配置缺少服务端验证与权限检查

## Problem Statement

用户可以在客户端完全控制助手的 `authMode` 配置（从 `ask` 改为 `auto`），无需任何权限验证或审计日志。如果后端 LangGraph SDK 信任客户端传入的 `authMode`，攻击者可以绕过安全审批流程，授权 AI 代理自动执行危险操作（文件写入、Shell 命令等）。

## Findings

**来源:** security-sentinel 审查报告

**文件位置:** `/Users/chentt/Github/deep-agents-ui/src/app/components/ConfigDialog.tsx` 第 285-318 行

**证据:**
```typescript
const handleSave = async () => {
  // ... 无权限验证逻辑
  await client.assistants.update(selectedAssistant.assistant_id, {
    config,
    metadata,  // authMode 直接存储在 metadata 中
  });
  // 无审计日志
}
```

**风险分析:**
1. **无权限验证**: 用户可以修改任何助手的 `authMode` 配置（包括从 `ask` 改为 `auto`）
2. **客户端信任边界**: `authMode` 直接存储在助手的 `metadata` 中，客户端可完全控制
3. **安全绕过风险**: 攻击者可将 `authMode` 从 `ask`（严格模式）改为 `auto`（自动模式）
4. **无审计日志**: 配置更改没有记录审计日志

**影响:**
- 恶意用户可以授权 AI 代理自动执行危险操作
- 如果后端没有额外验证，可能导致严重的安全绕过

## Proposed Solutions

### 方案 A: 服务端权限验证（推荐）

**实现:**
```typescript
const handleSave = async () => {
  const { config, metadata } = mapFromForm(formValues);
  
  // 验证 authMode 更改是否被允许
  if (metadata.authMode && metadata.authMode !== selectedAssistant.metadata?.authMode) {
    const hasPermission = await checkAuthModeChangePermission(
      selectedAssistant.assistant_id,
      metadata.authMode
    );
    if (!hasPermission) {
      toast.error("Permission denied: Cannot change auth mode");
      return;
    }
  }
  
  // 记录审计日志
  await logAuditEvent({
    action: "assistant_config_update",
    assistantId: selectedAssistant.assistant_id,
    changes: { authMode: metadata.authMode },
    userId: config.userId,
    timestamp: new Date().toISOString(),
  });
};
```

**Pros:**
- 从根本上防止未授权的配置更改
- 审计日志提供可追溯性
- 符合安全最佳实践

**Cons:**
- 需要后端 API 支持权限检查和审计日志
- 增加实现复杂度

**Effort:** Medium (4 小时)

**Risk:** 低

---

### 方案 B: 客户端警告 + 后端最终验证

**实现:**
```typescript
const handleSave = async () => {
  if (metadata.authMode === "auto") {
    const confirmed = await confirm(
      "切换到 Auto 模式将绕过所有安全审批。确定继续？"
    );
    if (!confirmed) return;
  }
  // 依赖后端进行最终验证
};
```

**Pros:**
- 实现简单
- 提供用户确认步骤

**Cons:**
- 仅依赖后端验证仍有风险
- 无法防止恶意用户直接调用 API

**Effort:** Small (1 小时)

**Risk:** 中

---

### 方案 C: 移除 Auto 模式或限制使用范围

**实现:**
- 仅允许特定角色（管理员）使用 Auto 模式
- 或在 UI 中隐藏 Auto 模式选项

**Pros:**
- 简单直接
- 减少误用风险

**Cons:**
- 降低功能灵活性
- 影响正常用户体验

**Effort:** Small (2 小时)

**Risk:** 低

---

## Recommended Action

**推荐方案 A** - 实现服务端权限验证和审计日志。这是唯一能从根本上防止安全绕过的方案。

**实施步骤:**
1. 后端添加权限检查 API
2. 后端添加审计日志记录
3. 前端在保存前调用权限检查
4. 添加错误处理和用户提示

---

## Acceptance Criteria

- [ ] 更改 authMode 前调用权限检查 API
- [ ] 无权限时阻止保存并显示错误消息
- [ ] 所有配置更改记录审计日志
- [ ] 审计日志包含：用户 ID、助手 ID、更改内容、时间戳
- [ ] 添加测试用例验证权限检查逻辑

---

## Technical Details

**Affected Files:**
- `/Users/chentt/Github/deep-agents-ui/src/app/components/ConfigDialog.tsx`
- 后端权限检查 API（待创建）
- 后端审计日志系统（待创建）

**Related Components:**
- `useChat.ts` - authMode 到 interruptBefore 的映射逻辑
- `chat-context.ts` - OverrideConfig 类型定义

---

## Work Log

### 2026-03-15 - 初始发现

**By:** security-sentinel agent

**Actions:**
- 审查 ConfigDialog.tsx 的 handleSave 函数
- 识别 authMode 配置的安全风险
- 生成详细的安全审计报告

**Learnings:**
- Auth Mode 是完全由客户端控制的黑盒
- 需要服务端验证来建立安全边界

---

## Resources

- PR: `refactor/config-dialog-ui-optimization`
- 安全审计报告：security-sentinel 审查结果
- LangGraph SDK 文档：https://langchain-ai.github.io/langgraphjs/
