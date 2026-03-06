"use client";

import { useEffect, useRef, useState } from "react";

export function useThrottledValue<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdatedRef = useRef<number>(0);
  const nextValueRef = useRef<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdatedRef.current;
    
    nextValueRef.current = value;

    if (timeSinceLastUpdate >= interval) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setThrottledValue(value);
      lastUpdatedRef.current = now;
    } else if (!timeoutRef.current) {
      // Schedule an update for the end of the interval
      const delay = interval - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(nextValueRef.current);
        lastUpdatedRef.current = Date.now();
        timeoutRef.current = null;
      }, delay);
    }
  }, [value, interval]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledValue;
}
