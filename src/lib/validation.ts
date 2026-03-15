import { z } from "zod";

export interface KeyedItem {
  key: string;
}

/**
 * 查找数组中的重复键
 * 时间复杂度：O(n)
 */
export function findDuplicateKeys<T extends KeyedItem>(items: T[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (item.key && seen.has(item.key)) {
      duplicates.add(item.key);
    }
    seen.add(item.key);
  }

  return Array.from(duplicates);
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
