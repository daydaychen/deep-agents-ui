import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Options for loading timeout
 */
interface LoadingTimeoutOptions {
  /** Timeout duration in milliseconds */
  timeout?: number;
  /** Callback when timeout completes */
  onTimeout?: () => void;
  /** Whether to trigger on loading state change (true = finished loading) */
  triggerOnNotLoading?: boolean;
}

/**
 * Hook for handling loading state with timeout
 * Useful for operations that should complete within a certain time
 */
export function useLoadingTimeout(
  isLoading: boolean,
  options: LoadingTimeoutOptions = {}
): {
  /** Whether a timeout is currently active */
  isTimedOut: boolean;
  /** Cancel any pending timeout */
  cancelTimeout: () => void;
} {
  const { timeout = 1000, onTimeout, triggerOnNotLoading = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const cancelTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Reset timeout state when loading starts
    if (isLoading) {
      setIsTimedOut(false);
      cancelTimeout();
      return;
    }

    // Only trigger timeout when loading finishes (if option is enabled)
    if (!isLoading && triggerOnNotLoading) {
      timeoutRef.current = setTimeout(() => {
        setIsTimedOut(true);
        onTimeout?.();
      }, timeout);
    }

    return cancelTimeout;
  }, [isLoading, timeout, triggerOnNotLoading, onTimeout, cancelTimeout]);

  return { isTimedOut, cancelTimeout };
}

/**
 * Create a debounced function that delays execution
 * Useful for batch operations or rate limiting
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for throttled value updates
 * Prevents rapid re-renders during streaming operations
 */
export function useThrottledState<T>(
  value: T,
  throttleMs: number = 100
): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > throttleMs) {
      setThrottledValue(value);
      lastUpdateRef.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateRef.current = Date.now();
      }, throttleMs - (now - lastUpdateRef.current));

      return () => clearTimeout(timer);
    }
  }, [value, throttleMs]);

  return throttledValue;
}