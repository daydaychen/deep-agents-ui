/**
 * Safely parse JSON string with prototype pollution protection
 */
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
