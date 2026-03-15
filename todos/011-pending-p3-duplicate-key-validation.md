---
status: pending
priority: p3
issue_id: "011"
tags: [code-quality, duplication, refactoring]
dependencies: []
---

# P3: 重复的键值检测逻辑应提取为工具函数

## Problem Statement

`ConfigDialog.tsx` 和 `KeyValueForm.tsx` 中都实现了重复键检测逻辑，代码重复且算法复杂度为 O(n²)。应提取为共享工具函数并优化为 O(n) 复杂度。

## Findings

**来源:** pattern-recognition-specialist 审查报告、performance-oracle 审查报告

**重复代码位置:**

### ConfigDialog.tsx (第 63-75 行)
```typescript
const checkDuplicates = (arr: { key: string }[], path: string) => {
  const keys = arr.map(e => e.key).filter(k => k !== "");
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicateKeys.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate keys are not allowed",
      path: [path],
    });
  }
};
checkDuplicates(data.configurable, "configurable");
checkDuplicates(data.metadata, "metadata");
```

### KeyValueForm.tsx (第 33-37 行)
```typescript
const duplicateKeys = keys.filter(
  (key, index) => key && keys.indexOf(key) !== index
);
```

**问题分析:**
1. **代码重复**: 相同的逻辑在两个文件中实现
2. **算法复杂度**: 使用 `indexOf` 在数组中查找，时间复杂度 O(n²)
3. **维护成本**: 如果需要修改逻辑，需要修改多处

**性能分析:**
- 如果有 20 个键值对，每次验证需要 400 次比较
- 使用 `Set` 可以优化为 O(n)

## Proposed Solutions

### 方案 A: 提取为工具函数并优化算法（推荐）

**实现:**
```typescript
// src/lib/validation.ts (新建)
export interface KeyedItem {
  key: string;
}

/**
 * 查找数组中的重复键
 * 时间复杂度：O(n)
 */
export function findDuplicateKeys<T extends KeyedItem>(items: T[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  
  for (const item of items) {
    if (item.key && seen.has(item.key)) {
      if (!duplicates.includes(item.key)) {
        duplicates.push(item.key);
      }
    }
    seen.add(item.key);
  }
  
  return duplicates;
}

/**
 * 为 Zod schema 创建重复键验证器
 */
export function createDuplicateKeyValidator() {
  return (arr: { key: string }[], path: string) => {
    const duplicates = findDuplicateKeys(arr);
    if (duplicates.length > 0) {
      return {
        code: z.ZodIssueCode.custom,
        message: `Duplicate keys: ${duplicates.join(", ")}`,
        path: [path],
      };
    }
    return undefined;
  };
}
```

**在 ConfigDialog.tsx 中使用:**
```typescript
import { findDuplicateKeys, createDuplicateKeyValidator } from "@/lib/validation";

const assistantFormSchema = z.object({
  // ...
}).superRefine((data, ctx) => {
  const validateDuplicates = createDuplicateKeyValidator();
  
  const configurableIssue = validateDuplicates(data.configurable, "configurable");
  if (configurableIssue) {
    ctx.addIssue(configurableIssue);
  }
  
  const metadataIssue = validateDuplicates(data.metadata, "metadata");
  if (metadataIssue) {
    ctx.addIssue(metadataIssue);
  }
});
```

**在 KeyValueForm.tsx 中使用:**
```typescript
import { findDuplicateKeys } from "@/lib/validation";

const duplicateKeys = findDuplicateKeys(fields);
```

**Pros:**
- 消除代码重复
- 算法优化为 O(n)
- 可复用到其他地方
- 易测试

**Cons:**
- 需要创建新文件
- 需要更新两处代码

**Effort:** Small (1 小时)

**Risk:** 低

---

### 方案 B: 仅在 ConfigDialog 中优化

**实现:**
```typescript
const checkDuplicates = (arr: { key: string }[], path: string) => {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  
  for (const item of arr) {
    if (item.key && seen.has(item.key)) {
      if (!duplicates.includes(item.key)) {
        duplicates.push(item.key);
      }
    }
    seen.add(item.key);
  }
  
  if (duplicates.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate keys: ${duplicates.join(", ")}`,
      path: [path],
    });
  }
};
```

**Pros:**
- 简单快速
- 优化算法复杂度

**Cons:**
- 未消除代码重复
- 未解决根本问题

**Effort:** Small (30 分钟)

**Risk:** 低

---

## Recommended Action

**推荐方案 A** - 提取为共享工具函数并优化算法。这是最符合代码质量最佳实践的修复方式。

**实施步骤:**
1. 创建 `src/lib/validation.ts`
2. 实现 `findDuplicateKeys` 和 `createDuplicateKeyValidator`
3. 更新 `ConfigDialog.tsx` 和 `KeyValueForm.tsx`
4. 添加测试用例

---

## Acceptance Criteria

- [ ] 创建 `src/lib/validation.ts`
- [ ] 实现 `findDuplicateKeys` 函数（O(n) 复杂度）
- [ ] 更新 `ConfigDialog.tsx` 使用新函数
- [ ] 更新 `KeyValueForm.tsx` 使用新函数
- [ ] 添加测试用例验证重复检测
- [ ] 测试性能（20 个键值对应 <1ms）

---

## Technical Details

**Affected Files:**
- `/Users/chentt/Github/deep-agents-ui/src/lib/validation.ts` (新建)
- `/Users/chentt/Github/deep-agents-ui/src/app/components/ConfigDialog.tsx`
- `/Users/chentt/Github/deep-agents-ui/src/app/components/ui/KeyValueForm.tsx`

**Related Components:**
- 无

---

## Work Log

### 2026-03-15 - 初始发现

**By:** pattern-recognition-specialist agent, performance-oracle agent

**Actions:**
- 发现重复的键值检测逻辑
- 识别 O(n²) 算法复杂度问题
- 生成模式和性能审查报告

**Learnings:**
- 代码重复增加维护成本
- 算法复杂度对性能影响显著

---

## Resources

- 模式审查报告：pattern-recognition-specialist 审查结果
- 性能审计报告：performance-oracle 审查结果
- 算法复杂度文档：https://en.wikipedia.org/wiki/Time_complexity
