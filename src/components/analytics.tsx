"use client";

import dynamic from "next/dynamic";

// Defer third-party analytics scripts until after hydration
// https://vercel.com/docs/concepts/next.js/best-practices#defer-non-critical-third-party-libraries
const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((mod) => mod.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false }
);

export function DeferredAnalytics() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
