"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Filter, Info, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { detectAntiCrawl } from "@/app/utils/tool-result-parser";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type LogEntry, useInspector } from "../inspector-context";
import { AntiCrawlAlert } from "../widgets/AntiCrawlAlert";
import { EmptyState } from "../widgets/EmptyState";

type LogFilter = "all" | "error" | "warn";

const LEVEL_ICONS: Record<LogEntry["level"], React.ReactNode> = {
  info: <Info className="h-3 w-3 text-blue-500/60" />,
  warn: <AlertTriangle className="h-3 w-3 text-[var(--color-warning)]" />,
  error: <AlertCircle className="h-3 w-3 text-destructive" />,
  success: <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" />,
};

export const LogTab = React.memo(() => {
  const { state } = useInspector();
  const t = useTranslations("inspector");
  const [filter, setFilter] = useState<LogFilter>("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    if (filter === "all") return state.logEntries;
    return state.logEntries.filter((e) => e.level === filter);
  }, [state.logEntries, filter]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Detect anti-crawl patterns in recent logs
  const antiCrawl = useMemo(() => {
    const recent = state.logEntries.slice(-20);
    for (const entry of recent) {
      const detection = detectAntiCrawl(entry.content);
      if (detection) return detection;
    }
    return null;
  }, [state.logEntries]);

  const hasValidation = !!state.validationResult;
  const hasLogs = state.logEntries.length > 0;

  if (!hasLogs && !hasValidation) {
    return (
      <div className="h-full w-full">
        <EmptyState
          icon={ScrollText}
          message={t("log.noLogs")}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      {/* Fixed Header Area */}
      <div className="shrink-0 space-y-3 pb-3">
        {/* Validation Result */}
        {hasValidation && state.validationResult && (
          <div
            className={cn(
              "rounded-lg border p-3",
              state.validationResult.valid
                ? "border-[color:color-mix(in_srgb,var(--color-success),transparent_70%)] bg-[color:color-mix(in_srgb,var(--color-success),transparent_93%)]"
                : "border-[color:color-mix(in_srgb,var(--color-error),transparent_70%)] bg-[color:color-mix(in_srgb,var(--color-error),transparent_93%)]",
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              {state.validationResult.valid ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest">
                {state.validationResult.valid
                  ? t("validation.passed")
                  : t("validation.failed", { count: state.validationResult.errors.length })}
              </span>
            </div>
            {state.validationResult.errors.length > 0 && (
              <ul className="ml-6 list-disc space-y-0.5">
                {state.validationResult.errors.map((err) => (
                  <li
                    key={err}
                    className="text-[11px] text-destructive"
                  >
                    {err}
                  </li>
                ))}
              </ul>
            )}
            {state.validationResult.warnings.length > 0 && (
              <ul className="ml-6 mt-2 list-disc space-y-0.5">
                {state.validationResult.warnings.map((w) => (
                  <li
                    key={w}
                    className="text-[11px] text-[var(--color-warning)]"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Anti-crawl alert */}
        {antiCrawl && <AntiCrawlAlert detection={antiCrawl} />}

        {/* Log filter */}
        {hasLogs && (
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              {t("log.title")}
            </h3>
            <div className="flex items-center gap-1">
              <Filter className="mr-1 h-3 w-3 text-muted-foreground/40" />
              {(["all", "error", "warn"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                    filter === f
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground/50 hover:text-muted-foreground",
                  )}
                >
                  {f === "all"
                    ? t("log.filterAll")
                    : f === "error"
                      ? t("log.filterErrors")
                      : t("log.filterWarnings")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log entries */}
      {hasLogs && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/40 bg-zinc-950/5 font-mono dark:bg-zinc-950/50">
          <ScrollArea className="h-full w-full p-2">
            <div className="space-y-0.5">
              {filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-2 rounded px-2 py-1 text-[11px] leading-relaxed",
                    entry.level === "error" && "bg-destructive/5",
                    entry.level === "warn" &&
                      "bg-[color:color-mix(in_srgb,var(--color-warning),transparent_93%)]",
                  )}
                >
                  <span className="mt-0.5 shrink-0">{LEVEL_ICONS[entry.level]}</span>
                  <span className="min-w-0 break-all text-foreground/80">{entry.content}</span>
                </div>
              ))}
              <div
                ref={bottomRef}
                className="h-px"
              />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
});

LogTab.displayName = "LogTab";
