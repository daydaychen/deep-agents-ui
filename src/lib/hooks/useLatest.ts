import { useRef } from "react";

/**
 * useLatest - Returns a ref that always holds the latest value.
 *
 * This hook is useful when you need to access the latest value in callbacks
 * (like setTimeout, event handlers, or async operations) without adding the
 * value to dependency arrays, which would cause the callback to be recreated.
 *
 * @example
 * ```typescript
 * const [count, setCount] = useState(0);
 * const countRef = useLatest(count);
 *
 * useEffect(() => {
 *   const timer = setTimeout(() => {
 *     console.log(countRef.current); // Always the latest count
 *   }, 1000);
 *   return () => clearTimeout(timer);
 * }, []); // No need to add count to deps
 * ```
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
