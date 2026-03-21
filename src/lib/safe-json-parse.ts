/**
 * Safely parse JSON string with prototype pollution protection
 */

// Hoisted RegExp to avoid recreating on each function call
const PROTOTYPE_POLLUTION_REGEX = /["'](__proto__|constructor|prototype)["']\s*:/;

/**
 * Measure the maximum nesting depth of a parsed JSON value.
 * Objects and arrays each count as one level of depth.
 */
function measureDepth(value: unknown): number {
  if (value === null || typeof value !== "object") return 0;
  let max = 0;
  const entries = Array.isArray(value) ? value : Object.values(value);
  for (const child of entries) {
    const childDepth = measureDepth(child);
    if (childDepth > max) max = childDepth;
  }
  return 1 + max;
}

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

  // Parse first, then measure actual nesting depth
  const result = JSON.parse(str);
  const depth = measureDepth(result);

  if (depth > maxDepth) {
    throw new Error(`JSON depth ${depth} exceeds maximum ${maxDepth}`);
  }

  return result;
}
