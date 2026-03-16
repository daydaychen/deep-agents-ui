"use client";

import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ActionRequest, ReviewConfig, ToolCall, UiComponent } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import {
  AlertCircle,
  ChevronDown,
  CircleCheckBigIcon,
  Loader2,
  StopCircle,
  Terminal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState, useMemo } from "react";

// Static icon components - hoisted outside to avoid recreation on every render
// Using CSS variables for consistent theming across light/dark modes
const CompletedIcon = (
  <CircleCheckBigIcon
    size={13}
    className="text-[var(--color-success)]"
  />
);

const ErrorIcon = (
  <AlertCircle
    size={13}
    className="text-destructive"
  />
);

const PendingIcon = (
  <div className="animate-spin">
    <Loader2
      size={13}
      className="text-[var(--color-warning)]"
    />
  </div>
);

const InterruptedIcon = (
  <StopCircle
    size={13}
    className="text-[var(--color-warning)]"
  />
);

const DefaultIcon = (
  <Terminal
    size={13}
    className="text-muted-foreground"
  />
);

interface ToolCallBoxProps {
  toolCall: ToolCall;
  uiComponent?: UiComponent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream?: any;
  graphId?: string;
  actionRequest?: ActionRequest;
  reviewConfig?: ReviewConfig;
  onResume?: (value: unknown) => void;
  isLoading?: boolean;
  messageId?: string;
}

export const ToolCallBox = React.memo<ToolCallBoxProps>(
  ({
    toolCall,
    uiComponent,
    stream,
    graphId,
    actionRequest,
    reviewConfig,
    onResume,
    isLoading,
    messageId,
  }) => {
    const t = useTranslations("toolCall");
    const [isExpanded, setIsExpanded] = useState(
      () => !!uiComponent || !!actionRequest
    );

    const hasUiComponent = !!uiComponent;
    const hasActionRequest = !!actionRequest;

    // Reset expansion state when messageId changes (e.g. thread switch)
    React.useEffect(() => {
      setIsExpanded(hasUiComponent || hasActionRequest);
    }, [messageId, hasUiComponent, hasActionRequest]);

    // Auto-expand/collapse based on status
    React.useEffect(() => {
      // 1. If currently active or waiting for input, ensure it's expanded
      if (
        toolCall.status === "pending" ||
        toolCall.status === "interrupted" ||
        hasActionRequest
      ) {
        setIsExpanded(true);
      }
      // 2. If finished successfully or with error, auto-collapse unless it has a UI component or active request
      else if (
        (toolCall.status === "completed" || toolCall.status === "error") &&
        !hasUiComponent &&
        !hasActionRequest
      ) {
        setIsExpanded(false);
      }
    }, [toolCall.status, hasUiComponent, hasActionRequest]);

    const [expandedArgs, setExpandedArgs] = useState<Record<string, boolean>>(
      {}
    );

    // Deep Arg Extraction
    const finalArgs = useMemo(() => {
      const toolCallAny = toolCall as unknown as Record<string, unknown>;
      const raw =
        toolCall.args ??
        toolCallAny.input ??
        (toolCallAny.function as Record<string, unknown>)?.arguments ??
        toolCallAny.arguments;

      // Early exit for falsy values
      if (!raw) return {};

      // Early exit for plain objects
      if (typeof raw === "object" && !Array.isArray(raw)) return raw;

      // Handle string values
      if (typeof raw !== "string" || (raw as string).trim() === "") return {};

      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" ? parsed : { value: parsed };
      } catch {
        return { text: raw };
      }
    }, [toolCall]);

    // Preview Logic
    const argsPreview = useMemo(() => {
      const entries = Object.entries(finalArgs);
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
        return preview.length > 80 ? preview.substring(0, 80) + "…" : preview;
      } catch {
        return "";
      }
    }, [finalArgs]);

    const name = toolCall.name || "Unknown Tool";
    const status = toolCall.status || "completed";
    const hasContent = toolCall.result || Object.keys(finalArgs).length > 0;

    const getStatusIcon = (status: string) => {
      switch (status) {
        case "completed":
          return CompletedIcon;
        case "error":
          return ErrorIcon;
        case "pending":
          return PendingIcon;
        case "interrupted":
          return InterruptedIcon;
        default:
          return DefaultIcon;
      }
    };
    const statusIcon = getStatusIcon(status);

    // Memoize status-based styles to prevent recalculation on every render
    const statusStyles = useMemo(() => {
      switch (status) {
        case "completed":
          return {
            border: "border-[var(--color-success)]/20",
            bg: "bg-[var(--color-success)]/[0.02]",
            iconBg: "bg-[var(--color-success)]/10",
            iconBorder: "border-[var(--color-success)]/20",
          };
        case "error":
          return {
            border: "border-destructive/20",
            bg: "bg-destructive/[0.02]",
            iconBg: "bg-destructive/10",
            iconBorder: "border-destructive/20",
          };
        case "pending":
          return {
            border: "border-[var(--color-warning)]/20",
            bg: "bg-[var(--color-warning)]/[0.02]",
            iconBg: "bg-[var(--color-warning)]/10",
            iconBorder: "border-[var(--color-warning)]/20",
          };
        case "interrupted":
          return {
            border: "border-[var(--color-warning)]/20",
            bg: "bg-[var(--color-warning)]/[0.02]",
            iconBg: "bg-[var(--color-warning)]/10",
            iconBorder: "border-[var(--color-warning)]/20",
          };
        default:
          return {
            border: "border-border",
            bg: "bg-card",
            iconBg: "bg-muted",
            iconBorder: "border-border",
          };
      }
    }, [status]);

    return (
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-xl border shadow-sm transition-[background-color,border-color,box-shadow,opacity,transform] duration-300",
          statusStyles.border,
          statusStyles.bg,
          isExpanded && hasContent && "shadow-md ring-1 ring-border/40"
        )}
      >
        {/* Header */}
        <button
          onClick={() => hasContent && setIsExpanded(!isExpanded)}
          disabled={!hasContent}
          aria-expanded={isExpanded}
          className={cn(
            "grid w-full min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors",
            hasContent ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
          )}
        >
          {/* Tool Status & Name */}
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md border shadow-inner",
                statusStyles.iconBorder,
                statusStyles.iconBg
              )}
            >
              {statusIcon}
            </div>
          </div>

          {/* Arguments Preview - CLI Style */}
          <div className="flex min-w-0 flex-1 items-center overflow-hidden px-2">
            <div className="inline-block max-w-full truncate font-mono text-[11px] leading-none text-muted-foreground/70">
              <span className="text-[var(--color-success)]">⏺</span>{" "}
              <span className="text-foreground/80">{name}</span>
              <span className="text-muted-foreground/50">(</span>
              <span className="text-muted-foreground/60">
                {argsPreview || t("noArgs")}
              </span>
              <span className="text-muted-foreground/50">)</span>
            </div>
          </div>

          {/* Expand Icon */}
          <div className="shrink-0">
            {hasContent && (
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60 transition-transform duration-300",
                  isExpanded && "rotate-180"
                )}
              >
                <ChevronDown size={12} />
              </div>
            )}
          </div>
        </button>

        {isExpanded && hasContent && (
          <div className="px-4 pb-4 duration-200 animate-in fade-in slide-in-from-top-1">
            <div className="mb-4 h-[1px] w-full bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {uiComponent && stream && graphId ? (
              <div className="min-w-0 overflow-hidden rounded-lg border bg-background/50 p-1">
                <LoadExternalComponent
                  key={uiComponent.id}
                  stream={stream}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  message={uiComponent as any}
                  namespace={graphId}
                  meta={{
                    status,
                    args: finalArgs,
                    result: toolCall.result ?? t("noResult"),
                  }}
                />
              </div>
            ) : actionRequest && onResume ? (
              <div className="min-w-0">
                <ToolApprovalInterrupt
                  actionRequest={actionRequest}
                  reviewConfig={reviewConfig}
                  onResume={onResume}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="min-w-0 space-y-4">
                {Object.keys(finalArgs).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Terminal
                        size={10}
                        className="text-muted-foreground/40"
                      />
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {t("inputParameters")}
                      </h4>
                    </div>
                    <div className="grid gap-1.5">
                      {Object.entries(finalArgs).map(([key, value]) => (
                        <div
                          key={key}
                          className="group overflow-hidden rounded-lg border border-border/40 bg-muted/10 transition-colors hover:border-border/80"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedArgs((p) => ({
                                ...p,
                                [key]: !p[key],
                              }));
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left"
                          >
                            <span className="text-primary/80 font-mono text-[11px] font-semibold transition-colors group-hover:text-primary">
                              {key}
                            </span>
                            <ChevronDown
                              size={12}
                              className={cn(
                                "text-muted-foreground/40 transition-transform",
                                expandedArgs[key] && "rotate-180"
                              )}
                            />
                          </button>
                          {expandedArgs[key] && (
                            <div className="border-t border-border/20 bg-muted/30 p-3 shadow-inner dark:bg-zinc-950">
                              <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground/80 dark:text-zinc-300">
                                {typeof value === "string"
                                  ? value
                                  : JSON.stringify(value, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {toolCall.result && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 px-1">
                      <CircleCheckBigIcon
                        size={10}
                        className="text-[var(--color-success)]/50"
                      />
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {t("executionResult")}
                      </h4>
                    </div>
                    <div className="border-[var(--color-success)]/10 overflow-x-auto rounded-lg border bg-muted/30 p-4 shadow-inner dark:bg-zinc-950">
                      <pre className="selection:bg-[var(--color-success)]/20 dark:text-[var(--color-success)]/90 m-0 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground/80">
                        {typeof toolCall.result === "string"
                          ? toolCall.result
                          : JSON.stringify(toolCall.result, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ToolCallBox.displayName = "ToolCallBox";
