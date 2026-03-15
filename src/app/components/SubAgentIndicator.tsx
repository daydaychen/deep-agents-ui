"use client";

import type { SubAgent } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Loader2,
  ScrollText,
} from "lucide-react";
import React, { useMemo } from "react";

interface SubAgentIndicatorProps {
  subAgent: SubAgent;
  onToggleExpand: () => void;
  onShowLogs: () => void;
  isExpanded?: boolean;
  isActiveInSidebar?: boolean;
}

// Static icon components - hoisted outside to avoid recreation on every render
const CompletedStatusIcon = (
  <CheckCircle2
    size={16}
    className="text-green-600"
  />
);
const ErrorStatusIcon = (
  <AlertCircle
    size={16}
    className="text-destructive"
  />
);
const DefaultStatusIcon = (
  <Bot
    size={16}
    className="text-muted-foreground"
  />
);

// Pending/Active icon with animation wrapper
const PendingActiveStatusIcon = (
  <div className="animate-spin">
    <Loader2
      size={16}
      className="text-blue-600"
    />
  </div>
);

const getStatusIcon = (status: SubAgent["status"]) => {
  switch (status) {
    case "completed":
      return CompletedStatusIcon;
    case "error":
      return ErrorStatusIcon;
    case "pending":
    case "active":
      return PendingActiveStatusIcon;
    default:
      return DefaultStatusIcon;
  }
};

export const SubAgentIndicator = React.memo<SubAgentIndicatorProps>(
  ({
    subAgent,
    onToggleExpand,
    onShowLogs,
    isExpanded = false,
    isActiveInSidebar = false,
  }) => {
    const status = subAgent.status || "pending";
    const name =
      subAgent.agentName && subAgent.agentName !== subAgent.subAgentName
        ? `${subAgent.agentName} (${subAgent.subAgentName})`
        : subAgent.agentName || subAgent.subAgentName;

    // Deep Arg Extraction for SubAgent Input Preview
    const argsPreview = useMemo(() => {
      const input = subAgent.input || {};

      // 1. Priority: If 'description' exists, show it directly (most meaningful)
      if (input.description && typeof input.description === "string") {
        const desc = input.description;
        return desc.length > 300 ? desc.substring(0, 300) + "…" : desc;
      }

      // 2. Fallback: Filter out redundant 'subagent_type' and join others
      const entries = Object.entries(input).filter(
        ([key]) => key !== "subagent_type"
      );
      if (entries.length === 0) return "";

      try {
        const preview = entries
          .map(([key, value]) => {
            let valStr = "";
            if (value === null || value === undefined) valStr = "null";
            else if (typeof value === "object")
              valStr = Array.isArray(value) ? "[...]" : "{...}";
            else valStr = String(value);
            return `${key}: ${valStr}`;
          })
          .join(", ");
        return preview.length > 300 ? preview.substring(0, 300) + "…" : preview;
      } catch {
        return "";
      }
    }, [subAgent.input]);

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border shadow-sm transition-[background-color,border-color,box-shadow,opacity,transform] duration-300",
          status === "completed"
            ? "border-emerald-500/20 bg-emerald-500/[0.02]"
            : status === "error"
            ? "border-destructive/20 bg-destructive/[0.02]"
            : status === "active"
            ? "border-blue-500/20 bg-blue-500/[0.02] ring-1 ring-blue-500/10"
            : status === "interrupted"
            ? "border-orange-500/20 bg-orange-500/[0.02]"
            : "border-border bg-card",
          isActiveInSidebar &&
            "border-primary/30 bg-primary/[0.03] shadow-md shadow-primary/5 ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-center gap-1 pr-1.5">
          {/* Main Click Area */}
          <button
            type="button"
            onClick={onToggleExpand}
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200",
              "hover:bg-muted/30 active:bg-muted/50"
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-inner transition-transform duration-500",
                  status === "completed"
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : status === "error"
                    ? "border-destructive/20 bg-destructive/10"
                    : status === "active"
                    ? "scale-105 border-blue-500/20 bg-blue-500/10"
                    : status === "interrupted"
                    ? "border-orange-500/20 bg-orange-500/10"
                    : "border-border bg-muted"
                )}
              >
                {getStatusIcon(status)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="mb-0.5 flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[13px] font-bold tracking-tight text-foreground/90">
                    {name}
                  </span>
                  {argsPreview && (
                    <div className="flex min-w-0 flex-1 items-center">
                      <div className="truncate rounded border border-border/10 bg-muted/20 px-1.5 py-1 font-mono text-[9px] leading-none text-muted-foreground/50">
                        {argsPreview}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                  {status === "active"
                    ? "Sub-Process Active"
                    : `Status: ${status}`}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60 transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            >
              <ChevronDown size={12} />
            </div>
          </button>

          {/* Logs Button */}
          <div className="flex shrink-0 items-center border-l border-border/20 py-1 pl-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onShowLogs();
              }}
              className={cn(
                "h-9 w-9 cursor-pointer rounded-xl transition-[background-color,border-color,color,opacity] duration-200",
                isActiveInSidebar
                  ? "text-primary-foreground hover:bg-primary/90 bg-primary shadow-lg shadow-primary/20 hover:shadow-xl"
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              )}
              title="View Internal Core Trace"
            >
              <ScrollText
                size={16}
                className={cn(isActiveInSidebar && "animate-pulse")}
              />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
