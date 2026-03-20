"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import type { AntiCrawlDetection } from "@/app/utils/tool-result-parser";

interface AntiCrawlAlertProps {
  detection: AntiCrawlDetection;
}

export const AntiCrawlAlert = React.memo<AntiCrawlAlertProps>(({ detection }) => {
  const t = useTranslations("inspector");

  return (
    <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-warning),transparent_60%)] bg-[color:color-mix(in_srgb,var(--color-warning),transparent_90%)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-warning)]">
          {t("antiCrawl.title")}
        </span>
      </div>
      <p className="mb-2 text-xs text-foreground/70">
        {detection.statusCode && (
          <span className="mr-2 font-mono font-bold">{detection.statusCode}</span>
        )}
        {detection.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {detection.suggestions.map((s, i) => (
          <span
            key={i}
            className="rounded-md border border-[color:color-mix(in_srgb,var(--color-warning),transparent_60%)] bg-background/50 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
});

AntiCrawlAlert.displayName = "AntiCrawlAlert";
