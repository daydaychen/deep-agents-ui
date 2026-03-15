---
status: pending
priority: p1
issue_id: "002"
tags: [security, xss, input-validation]
dependencies: []
---

# P1: JSON 解析注入风险（原型污染）

## Problem Statement

`ConfigDialog.tsx` 中的 `mapFromForm` 函数直接解析用户输入的 JSON 字符串，没有防止原型污染攻击。攻击者可以输入 `{"__proto__": {"isAdmin": true}}` 来污染 JavaScript 原型链，可能导致权限绕过或意外行为。

## Findings

**来源:** security-sentinel 审查报告

**文件位置:** `/Users/chentt/Github/deep-agents-ui/src/app/components/ConfigDialog.tsx` 第 196-217 行

**证据:**
```typescript
const mapFromForm = (values: AssistantFormValues) => {
  const fromEntries = (entries: { key: string; value: string }[]) => {
    const obj: Record<string, any> = {};
    entries.forEach(({ key, value }) => {
      if (!key) return;
      try {
        if (
          (value.startsWith("{") && value.endsWith("}")) ||
          (value.startsWith("[") && value.endsWith("]")) ||
          value === "true" || value === "false" ||
          !isNaN(Number(value))
        ) {
          obj[key] = JSON.parse(value);  // ⚠️ 直接解析用户输入
        } else {
          obj[key] = value;
        }
      } catch {
        obj[key] = value;
      }
    });
    return obj;
  };
```

**风险分析:**
1. **原型污染**: 攻击者可以输入 `__proto__` 键来污染原型链
2. **恶意代码执行**: 解析的值可能包含恶意构造函数
3. **无输入净化**: `JSON.parse` 直接解析任意字符串，无白名单验证

**影响:**
- 如果后端使用这些配置值进行敏感操作，可能导致权限绕过
- 可能影响应用程序的其他部分（如果配置对象被合并到全局状态）

## Proposed Solutions

### 方案 A: 安全 JSON 解析器（推荐）

**实现:**
```typescript
// src/lib/safe-json-parse.ts (新建)
export function parseJSON(
  str: string, 
  options: { disallowPrototypes?: boolean; maxDepth?: number } = {}
): unknown {
  const { disallowPrototypes = true, maxDepth = 5 } = options;
  
  // 检查原型污染键
  const hasPrototypePollution = /["'](__proto__|constructor|prototype)["']\s*:/.test(str);
  if (hasPrototypePollution && disallowPrototypes) {
    throw new Error("Prototype pollution attempt detected");
  }
  
  // 检查深度
  const depth = (str.match(/{/g) || []).length;
  if (depth > maxDepth) {
    throw new Error(`JSON depth ${depth} exceeds maximum ${maxDepth}`);
  }
  
  return JSON.parse(str);
}

// ConfigDialog.tsx 中使用
import { parseJSON } from "@/lib/safe-json-parse";

obj[key] = parseJSON(value, { disallowPrototypes: true, maxDepth: 5 });
```

**Pros:**
- 从根本上防止原型污染
- 可复用到其他需要 JSON 解析的地方
- 提供深度限制防止 DoS

**Cons:**
- 需要创建新工具文件
- 增加少量性能开销

**Effort:** Small (2 小时)

**Risk:** 低

---

### 方案 B: 键名白名单验证

**实现:**
```typescript
const fromEntries = (entries: { key: string; value: string }[]) => {
  const BLOCKED_KEYS = ["__proto__", "constructor", "prototype"];
  const obj: Record<string, any> = {};
  
  entries.forEach(({ key, value }) => {
    if (!key || BLOCKED_KEYS.includes(key)) {
      console.warn("Blocked prototype pollution attempt:", key);
      return;
    }
    // ... 原有解析逻辑
  });
  
  return obj;
};
```

**Pros:**
- 实现简单
- 直接阻止常见攻击向量

**Cons:**
- 可能遗漏其他攻击向量
- 不如方案 A 全面

**Effort:** Small (1 小时)

**Risk:** 低

---

### 方案 C: 使用结构化数据而非 JSON 字符串

**实现:**
- 修改 UI，使用嵌套表单而非 JSON 文本输入
- 完全避免 JSON 解析

**Pros:**
- 彻底消除风险
- 改善用户体验

**Cons:**
- 需要重构整个 configurable/metadata 编辑界面
- 工作量大

**Effort:** Large (8+ 小时)

**Risk:** 中

---

## Recommended Action

**推荐方案 A + B 组合** - 创建安全 JSON 解析器并添加键名白名单验证。这是防御性编程的最佳实践。

**实施步骤:**
1. 创建 `src/lib/safe-json-parse.ts`
2. 在 `ConfigDialog.tsx` 中使用安全解析器
3. 添加键名白名单检查
4. 添加测试用例

---

## Acceptance Criteria

- [ ] 创建安全 JSON 解析工具函数
- [ ] 阻止 `__proto__`、`constructor`、`prototype` 键
- [ ] 添加 JSON 深度限制（最大 5 层）
- [ ] 所有 configurable/metadata 值使用安全解析
- [ ] 添加测试用例验证原型污染防护

---

## Technical Details

**Affected Files:**
- `/Users/chentt/Github/deep-agents-ui/src/app/components/ConfigDialog.tsx`
- `/Users/chentt/Github/deep-agents-ui/src/lib/safe-json-parse.ts` (新建)

**Related Components:**
- `KeyValueForm.tsx` - 也使用类似的解析逻辑

---

## Work Log

### 2026-03-15 - 初始发现

**By:** security-sentinel agent

**Actions:**
- 审查 mapFromForm 函数的 JSON 解析逻辑
- 识别原型污染风险
- 生成安全审计报告

**Learnings:**
- 直接解析用户输入的 JSON 是常见的安全漏洞
- 需要防御性编程来防止原型污染

---

## Resources

- OWASP Prototype Pollution: https://owasp.org/www-community/vulnerabilities/Prototype_Pollution
- 安全审计报告：security-sentinel 审查结果
