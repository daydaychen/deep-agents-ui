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
    size={13}
    className="text-[var(--color-success)]"
  />
);
const ErrorStatusIcon = (
  <AlertCircle
    size={13}
    className="text-destructive"
  />
);
const DefaultStatusIcon = (
  <Bot
    size={13}
    className="text-muted-foreground"
  />
);

// Pending/Active icon with animation wrapper
const PendingActiveStatusIcon = (
  <div className="animate-spin">
    <Loader2
      size={13}
      className="text-[var(--color-primary)]"
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

    const statusStyles = useMemo(() => {
      switch (status) {
        case "completed":
          return {
            border: "border-[color:color-mix(in_srgb,var(--color-success),transparent_70%)]",
            bg: "bg-[color:color-mix(in_srgb,var(--color-success),transparent_93%)]",
            hoverBg: "hover:bg-[color:color-mix(in_srgb,var(--color-success),transparent_88%)]",
            iconBg: "bg-[color:color-mix(in_srgb,var(--color-success),transparent_85%)]",
            iconBorder: "border-[color:color-mix(in_srgb,var(--color-success),transparent_70%)]",
            darkBorder: "dark:border-[color:color-mix(in_srgb,var(--color-success),transparent_95%)]",
          };
        case "error":
          return {
            border: "border-[color:color-mix(in_srgb,var(--color-error),transparent_70%)]",
            bg: "bg-[color:color-mix(in_srgb,var(--color-error),transparent_93%)]",
            hoverBg: "hover:bg-[color:color-mix(in_srgb,var(--color-error),transparent_88%)]",
            iconBg: "bg-[color:color-mix(in_srgb,var(--color-error),transparent_85%)]",
            iconBorder: "border-[color:color-mix(in_srgb,var(--color-error),transparent_70%)]",
            darkBorder: "dark:border-[color:color-mix(in_srgb,var(--color-error),transparent_95%)]",
          };
        case "active":
          return {
            border: "border-[color:color-mix(in_srgb,var(--color-primary),transparent_70%)]",
            bg: "bg-[color:color-mix(in_srgb,var(--color-primary),transparent_93%)]",
            hoverBg: "hover:bg-[color:color-mix(in_srgb,var(--color-primary),transparent_88%)]",
            iconBg: "bg-[color:color-mix(in_srgb,var(--color-primary),transparent_85%)]",
            iconBorder: "border-[color:color-mix(in_srgb,var(--color-primary),transparent_70%)]",
            darkBorder: "dark:border-[color:color-mix(in_srgb,var(--color-primary),transparent_95%)]",
          };
        case "pending":
          return {
            border: "border-border/30",
            bg: "bg-muted/30",
            hoverBg: "hover:bg-muted/50",
            iconBg: "bg-muted/40",
            iconBorder: "border-border/50",
            darkBorder: "dark:border-[color:color-mix(in_srgb,var(--color-foreground),transparent_95%)]",
          };
        case "interrupted":
          return {
            border: "border-[color:color-mix(in_srgb,var(--color-warning),transparent_70%)]",
            bg: "bg-[color:color-mix(in_srgb,var(--color-warning),transparent_93%)]",
            hoverBg: "hover:bg-[color:color-mix(in_srgb,var(--color-warning),transparent_88%)]",
            iconBg: "bg-[color:color-mix(in_srgb,var(--color-warning),transparent_85%)]",
            iconBorder: "border-[color:color-mix(in_srgb,var(--color-warning),transparent_70%)]",
            darkBorder: "dark:border-[color:color-mix(in_srgb,var(--color-warning),transparent_95%)]",
          };
        default:
          return {
            border: "border-border/30",
            bg: "bg-muted/30",
            hoverBg: "hover:bg-muted/50",
            iconBg: "bg-muted/40",
            iconBorder: "border-border/50",
            darkBorder: "dark:border-[color:color-mix(in_srgb,var(--color-foreground),transparent_95%)]",
          };
      }
    }, [status]);

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border-[0.5px] shadow-sm transition-[background-color,border-color,box-shadow,opacity,transform] duration-300",
          statusStyles.border,
          statusStyles.bg,
          statusStyles.hoverBg,
          statusStyles.darkBorder, // 5% border in dark mode instead of total suppression
          isActiveInSidebar &&
            "border-primary/40 bg-primary/20 shadow-md shadow-primary/5 ring-1 ring-primary/20 dark:ring-primary/40"
        )}
      >
        <div className="flex items-center gap-1 pr-1.5">
          {/* Main Click Area - Unified Layout */}
          <button
            type="button"
            onClick={onToggleExpand}
            className={cn(
              "grid w-full min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 text-left transition-colors duration-200",
              "hover:bg-muted/30 active:bg-muted/50"
            )}
          >
            {/* Tool Status & Name */}
            <div className="flex min-w-0 shrink-0 items-center gap-2.5">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border shadow-inner transition-transform duration-500",
                  statusStyles.iconBorder,
                  statusStyles.iconBg,
                  "dark:border-white/5",
                  status === "active" && "scale-105"
                )}
              >
                {getStatusIcon(status)}
              </div>
            </div>

            {/* Arguments Preview - CLI Style parity */}
            <div className="flex min-w-0 flex-1 items-center overflow-hidden px-2">
              <div className="inline-block max-w-full truncate font-mono text-[11px] leading-none text-muted-foreground/70">
                <span className="text-foreground font-bold">{name}</span>
                {argsPreview && (
                  <>
                    <span className="text-muted-foreground/50 ml-1.5">(</span>
                    <span className="text-muted-foreground/60">
                      {argsPreview}
                    </span>
                    <span className="text-muted-foreground/50">)</span>
                  </>
                )}
              </div>
            </div>

            {/* Expand Icon */}
            <div className="shrink-0">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60 transition-transform duration-300",
                  isExpanded && "rotate-180"
                )}
              >
                <ChevronDown size={12} />
              </div>
            </div>
          </button>

          {/* Logs Button - Subtle Polish */}
          <div className="flex shrink-0 items-center border-l border-border/20 dark:border-white/5 py-1 pl-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onShowLogs();
              }}
              className={cn(
                "h-8 w-8 cursor-pointer rounded-xl transition-[background-color,border-color,color,opacity] duration-200",
                isActiveInSidebar
                  ? "text-primary-foreground hover:bg-primary/90 bg-primary shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-primary dark:hover:bg-white/5"
              )}
              title="View Internal Core Trace"
            >
              <ScrollText
                size={14}
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
