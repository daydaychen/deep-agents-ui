import { useEffect, useState } from "react";

/**
 * Hook to detect if the user prefers reduced motion.
 * Returns true if the user has enabled "Reduce motion" in their system preferences.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
 * @see https://www.w3.org/WAI/WCAG21/Techniques/css/C39
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
