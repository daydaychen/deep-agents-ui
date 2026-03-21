"use client";

import type { UIMessage } from "@langchain/langgraph-sdk/react-ui";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import {
  AlertCircle,
  ChevronDown,
  CircleCheckBigIcon,
  FileStack,
  FlaskConical,
  Globe,
  Loader2,
  PanelRightOpen,
  StopCircle,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";
import { useInspectorOptional } from "@/app/components/inspector/inspector-context";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ActionRequest, ReviewConfig, ToolCall, UiComponent } from "@/app/types/types";
import {
  getToolCategory,
  getToolSummary,
  parseToolResult,
  type ToolCategory,
} from "@/app/utils/tool-result-parser";
import { cn } from "@/lib/utils";

// Static icon components - hoisted outside to avoid recreation on every render
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
  <div className="animate-spin text-[var(--color-primary)]">
    <Loader2 size={13} />
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

// Tool category badge config
const CATEGORY_CONFIG: Record<ToolCategory, { icon: React.ReactNode; colorClass: string }> = {
  task: {
    icon: <Wrench className="h-2.5 w-2.5" />,
    colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  test: {
    icon: <FlaskConical className="h-2.5 w-2.5" />,
    colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  hook: {
    icon: <Zap className="h-2.5 w-2.5" />,
    colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  },
  template: {
    icon: <FileStack className="h-2.5 w-2.5" />,
    colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
  browser: {
    icon: <Globe className="h-2.5 w-2.5" />,
    colorClass: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
  },
  unknown: {
    icon: <Terminal className="h-2.5 w-2.5" />,
    colorClass: "bg-muted text-muted-foreground border-border/30",
  },
};

interface ToolCallBoxProps {
  toolCall: ToolCall;
  uiComponent?: UiComponent;
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
  }) => {
    const t = useTranslations("toolCall");
    const tInspector = useTranslations("inspector");
    const inspector = useInspectorOptional();
    const [isExpanded, setIsExpanded] = useState(() => !!uiComponent || !!actionRequest);

    const hasUiComponent = !!uiComponent;
    const hasActionRequest = !!actionRequest;

    // Reset expansion state when messageId changes (e.g. thread switch)
    React.useEffect(() => {
      setIsExpanded(hasUiComponent || hasActionRequest);
    }, [hasUiComponent, hasActionRequest]);

    // Auto-expand/collapse based on status
    React.useEffect(() => {
      if (toolCall.status === "pending" || toolCall.status === "interrupted" || hasActionRequest) {
        setIsExpanded(true);
      } else if (
        (toolCall.status === "completed" || toolCall.status === "error") &&
        !hasUiComponent &&
        !hasActionRequest
      ) {
        setIsExpanded(false);
      }
    }, [toolCall.status, hasUiComponent, hasActionRequest]);

    // Parse tool result once and memoize
    const parsedResult = useMemo(() => {
      if (toolCall.status !== "completed" || !toolCall.result) return null;
      return parseToolResult(toolCall.name, toolCall.result, toolCall.id);
    }, [toolCall.status, toolCall.result, toolCall.name, toolCall.id]);

    const canInspect = !!inspector && !!parsedResult;

    // Auto-push to Inspector when tool completes
    const hasPushedRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      if (!inspector || !parsedResult) return;
      // Avoid duplicate pushes for same tool call
      const pushKey = `${toolCall.id}-${toolCall.status}`;
      if (hasPushedRef.current === pushKey) return;

      hasPushedRef.current = pushKey;

      if (parsedResult.type === "config") {
        inspector.dispatch({
          type: "PUSH_CONFIG",
          payload: {
            config: parsedResult.data,
            taskName: parsedResult.metadata?.taskName || toolCall.name,
            toolCallId: toolCall.id,
          },
        });
      } else if (parsedResult.type === "validation") {
        inspector.dispatch({
          type: "PUSH_VALIDATION",
          payload: parsedResult.data,
        });
      } else if (parsedResult.type === "test_log") {
        inspector.dispatch({
          type: "PUSH_LOG",
          payload: parsedResult.data,
        });
      } else if (parsedResult.type === "screenshot") {
        inspector.dispatch({
          type: "PUSH_SCREENSHOT",
          payload: parsedResult.data,
        });
      }
    }, [inspector, toolCall.id, toolCall.status, toolCall.name, parsedResult]);

    const [expandedArgs, setExpandedArgs] = useState<Record<string, boolean>>({});

    // Deep Arg Extraction
    const finalArgs = useMemo(() => {
      const raw =
        toolCall.args ??
        (toolCall as ToolCall & Record<string, unknown>).input ??
        ((toolCall as ToolCall & Record<string, unknown>).function as Record<string, unknown>)
          ?.arguments ??
        (toolCall as ToolCall & Record<string, unknown>).arguments;
      if (!raw) return {};
      if (typeof raw === "object" && !Array.isArray(raw)) return raw;
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
            else if (typeof value === "object") valStr = Array.isArray(value) ? "[...]" : "{...}";
            else valStr = String(value);
            return `${key}: ${valStr}`;
          })
          .join(", ");
        return preview.length > 80 ? `${preview.substring(0, 80)}…` : preview;
      } catch {
        return "";
      }
    }, [finalArgs]);

    // Tool category and summary
    const category = useMemo(() => getToolCategory(toolCall.name), [toolCall.name]);
    const categoryConfig = CATEGORY_CONFIG[category];

    const summary = useMemo(
      () =>
        toolCall.status === "completed" ? getToolSummary(toolCall.name, toolCall.result) : null,
      [toolCall.name, toolCall.result, toolCall.status],
    );

    const handleViewInInspector = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!inspector || !parsedResult) return;

        // Open inspector to the appropriate tab
        inspector.dispatch({ type: "OPEN_PANEL", payload: parsedResult.inspectorTab });
        inspector.onRequestShow?.();
      },
      [inspector, parsedResult],
    );

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

    const statusStyles = useMemo(() => {
      switch (status) {
        case "completed":
          return {
            border: "border-[color:color-mix(in_srgb,var(--color-success),transparent_70%)]",
            bg: "bg-[color:color-mix(in_srgb,var(--color-success),transparent_93%)]",
            hoverBg: "hover:bg-[color:color-mix(in_srgb,var(--color-success),transparent_88%)]",
            iconBg: "bg-[color:color-mix(in_srgb,var(--color-success),transparent_85%)]",
            iconBorder: "border-[color:color-mix(in_srgb,var(--color-success),transparent_70%)]",
            darkBorder:
              "dark:border-[color:color-mix(in_srgb,var(--color-success),transparent_95%)]",
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
        case "pending":
          return {
            border: "border-[color:color-mix(in_srgb,var(--color-primary),transparent_70%)]",
            bg: "bg-[color:color-mix(in_srgb,var(--color-primary),transparent_93%)]",
            hoverBg: "hover:bg-[color:color-mix(in_srgb,var(--color-primary),transparent_88%)]",
            iconBg: "bg-[color:color-mix(in_srgb,var(--color-primary),transparent_85%)]",
            iconBorder: "border-[color:color-mix(in_srgb,var(--color-primary),transparent_70%)]",
            darkBorder:
              "dark:border-[color:color-mix(in_srgb,var(--color-primary),transparent_95%)]",
          };
        case "interrupted":
          return {
            border: "border-[color:color-mix(in_srgb,var(--color-warning),transparent_70%)]",
            bg: "bg-[color:color-mix(in_srgb,var(--color-warning),transparent_93%)]",
            hoverBg: "hover:bg-[color:color-mix(in_srgb,var(--color-warning),transparent_88%)]",
            iconBg: "bg-[color:color-mix(in_srgb,var(--color-warning),transparent_85%)]",
            iconBorder: "border-[color:color-mix(in_srgb,var(--color-warning),transparent_70%)]",
            darkBorder:
              "dark:border-[color:color-mix(in_srgb,var(--color-warning),transparent_95%)]",
          };
        default:
          return {
            border: "border-border/30",
            bg: "bg-muted/30",
            hoverBg: "hover:bg-muted/50",
            iconBg: "bg-muted/40",
            iconBorder: "border-border/50",
            darkBorder:
              "dark:border-[color:color-mix(in_srgb,var(--color-foreground),transparent_95%)]",
          };
      }
    }, [status]);

    return (
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-xl border-[0.5px] shadow-sm transition-[background-color,border-color,box-shadow,opacity,transform] duration-300",
          statusStyles.border,
          statusStyles.bg,
          statusStyles.hoverBg,
          statusStyles.darkBorder,
          isExpanded && hasContent && "shadow-md ring-1 ring-border/20 dark:ring-white/[0.01]",
        )}
      >
        {/* Header Container */}
        <div className="relative">
          {/* Main Toggle Button - Covers the entire header area */}
          <button
            type="button"
            onClick={() => hasContent && setIsExpanded(!isExpanded)}
            disabled={!hasContent}
            aria-expanded={hasContent ? isExpanded : undefined}
            className={cn(
              "grid w-full min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 text-left transition-colors",
              hasContent ? "cursor-pointer hover:bg-muted/30" : "cursor-default",
            )}
          >
            {/* Tool Status & Name */}
            <div className="flex min-w-0 shrink-0 items-center gap-2.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md border shadow-inner",
                  statusStyles.iconBorder,
                  statusStyles.iconBg,
                )}
              >
                {statusIcon}
              </div>
            </div>

            {/* Tool Name + Category Badge + Summary */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden px-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-[11px] font-bold leading-none text-foreground">
                  {name}
                </span>
                {/* Category badge */}
                {category !== "unknown" && (
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wider",
                      categoryConfig.colorClass,
                    )}
                  >
                    {categoryConfig.icon}
                    {tInspector(`toolCategory.${category}`)}
                  </span>
                )}
              </div>
              {/* Result summary when collapsed */}
              {!isExpanded && summary && (
                <span className="truncate text-[10px] leading-none text-muted-foreground/60">
                  {summary}
                </span>
              )}
              {/* Args preview when no summary */}
              {!isExpanded && !summary && argsPreview && (
                <span className="truncate font-mono text-[10px] leading-none text-muted-foreground/50">
                  ({argsPreview})
                </span>
              )}
            </div>

            {/* Actions Spacer/Chevron */}
            <div className="flex shrink-0 items-center gap-1">
              {/* Reservation for Inspector button space */}
              {canInspect && <div className="w-[26px]" />}

              {hasContent && (
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60 transition-transform duration-300",
                    isExpanded && "rotate-180",
                  )}
                >
                  <ChevronDown size={12} />
                </div>
              )}
            </div>
          </button>

          {/* View in Inspector button - Positioned over the spacer in the button */}
          {canInspect && (
            <div className="absolute right-10 top-1/2 z-10 -translate-y-1/2">
              <button
                type="button"
                onClick={handleViewInInspector}
                className="flex h-5 items-center gap-1 rounded-md bg-primary/10 px-1.5 text-[9px] font-medium text-primary transition-colors hover:bg-primary/20"
                title={tInspector("actions.viewInInspector")}
              >
                <PanelRightOpen size={10} />
              </button>
            </div>
          )}
        </div>

        {isExpanded && hasContent && (
          <div className="px-4 pb-4 duration-200 animate-in fade-in slide-in-from-top-1">
            <div className="mb-4 h-[1px] w-full bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {uiComponent && stream && graphId ? (
              <div className="min-w-0 overflow-hidden rounded-lg border bg-background/50 p-1">
                <LoadExternalComponent
                  key={uiComponent.id}
                  stream={stream}
                  message={uiComponent as UIMessage}
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
                            type="button"
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
                                expandedArgs[key] && "rotate-180",
                              )}
                            />
                          </button>
                          {expandedArgs[key] && (
                            <div className="border-t border-border/20 bg-muted/30 p-3 shadow-inner dark:bg-zinc-950">
                              <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground/80 dark:text-zinc-300">
                                {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
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
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <CircleCheckBigIcon
                          size={10}
                          className="text-[var(--color-success)]/50"
                        />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          {t("executionResult")}
                        </h4>
                      </div>
                      {/* View in Inspector inside expanded view */}
                      {canInspect && (
                        <button
                          type="button"
                          onClick={handleViewInInspector}
                          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          <PanelRightOpen size={10} />
                          {tInspector("actions.viewInInspector")}
                        </button>
                      )}
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
  },
);

ToolCallBox.displayName = "ToolCallBox";
