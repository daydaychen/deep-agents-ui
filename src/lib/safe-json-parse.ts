/**
 * Safely parse JSON string with prototype pollution protection
 */

// Hoisted RegExp to avoid recreating on each function call
const PROTOTYPE_POLLUTION_REGEX = /["'](__proto__|constructor|prototype)["']\s*:/;

export function parseJSON(
  str: string,
  options: { disallowPrototypes?: boolean; maxDepth?: number } = {},
): unknown {
  const { disallowPrototypes = true, maxDepth = 5 } = options;

  // 检查原型污染键
  const hasPrototypePollution = PROTOTYPE_POLLUTION_REGEX.test(str);
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
