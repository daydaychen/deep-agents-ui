"use client";

import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ActionRequest, ReviewConfig, ToolCall } from "@/app/types/types";
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
import React, { useMemo, useState } from "react";

interface ToolCallBoxProps {
  toolCall: ToolCall;
  uiComponent?: any;
  stream?: any;
  graphId?: string;
  actionRequest?: ActionRequest;
  reviewConfig?: ReviewConfig;
  onResume?: (value: any) => void;
  isLoading?: boolean;
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
    const [isExpanded, setIsExpanded] = useState(
      () => !!uiComponent || !!actionRequest
    );
    const [expandedArgs, setExpandedArgs] = useState<Record<string, boolean>>(
      {}
    );

    // Deep Arg Extraction
    const finalArgs = useMemo(() => {
      const raw = (toolCall.args as any) ?? (toolCall as any).input ?? (toolCall as any).function?.arguments ?? (toolCall as any).arguments;
      if (!raw) return {};
      if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
      if (typeof raw === 'string' && (raw as string).trim() !== "") {
        try {
          const parsed = JSON.parse(raw);
          return typeof parsed === 'object' ? parsed : { value: parsed };
        } catch {
          return { text: raw };
        }
      }
      return {};
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
            else if (typeof value === 'object') valStr = Array.isArray(value) ? "[...]" : "{...}";
            else valStr = String(value);
            return `${key}: ${valStr}`;
          })
          .join(", ");
        return preview.length > 80 ? preview.substring(0, 80) + "..." : preview;
      } catch {
        return "";
      }
    }, [finalArgs]);

    const name = toolCall.name || "Unknown Tool";
    const status = toolCall.status || "completed";
    const hasContent = toolCall.result || Object.keys(finalArgs).length > 0;

    const statusIcon = useMemo(() => {
      switch (status) {
        case "completed": return <CircleCheckBigIcon size={13} className="text-emerald-500" />;
        case "error": return <AlertCircle size={13} className="text-destructive" />;
        case "pending": return <Loader2 size={13} className="animate-spin text-blue-500" />;
        case "interrupted": return <StopCircle size={13} className="text-orange-500" />;
        default: return <Terminal size={13} className="text-muted-foreground" />;
      }
    }, [status]);

    return (
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-xl border shadow-sm transition-all duration-300",
          status === "completed" ? "border-emerald-500/20 bg-emerald-500/[0.02]" : 
          status === "error" ? "border-destructive/20 bg-destructive/[0.02]" : 
          status === "pending" ? "border-blue-500/20 bg-blue-500/[0.02]" : 
          status === "interrupted" ? "border-orange-500/20 bg-orange-500/[0.02]" : "border-border bg-card",
          isExpanded && hasContent && "ring-1 ring-border/40 shadow-md"
        )}
      >
        {/* Header */}
        <button 
          onClick={() => hasContent && setIsExpanded(!isExpanded)}
          disabled={!hasContent}
          aria-expanded={isExpanded}
          className={cn(
            "grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 min-w-0 w-full text-left transition-colors",
            hasContent ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
          )}
        >
          {/* Tool Status & Name */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border shadow-inner",
              status === "completed" ? "bg-emerald-500/10 border-emerald-500/20" : 
              status === "error" ? "bg-destructive/10 border-destructive/20" : 
              status === "pending" ? "bg-blue-500/10 border-blue-500/20" : 
              status === "interrupted" ? "bg-orange-500/10 border-orange-500/20" : "bg-muted border-border"
            )}>
              {statusIcon}
            </div>
            <span className="text-[13px] font-bold tracking-tight text-foreground/90 truncate">
              {name}
            </span>
          </div>
          
          {/* Arguments Preview */}
          <div className="min-w-0 flex-1 overflow-hidden px-2 flex items-center">
            <div className="truncate font-mono text-[10px] leading-none text-muted-foreground/60 bg-muted/20 rounded px-1.5 py-1 border border-border/10 inline-block max-w-full">
              {argsPreview || "no-args"}
            </div>
          </div>

          {/* Expand Icon */}
          <div className="shrink-0">
            {hasContent && (
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60 transition-transform duration-300",
                isExpanded && "rotate-180"
              )}>
                <ChevronDown size={12} />
              </div>
            )}
          </div>
        </button>

        {isExpanded && hasContent && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-border/40 to-transparent mb-4" />
            
            {uiComponent && stream && graphId ? (
              <div className="min-w-0 overflow-hidden rounded-lg border bg-background/50 p-1">
                <LoadExternalComponent
                  key={uiComponent.id}
                  stream={stream}
                  message={uiComponent}
                  namespace={graphId}
                  meta={{ status, args: finalArgs, result: toolCall.result ?? "No Result Yet" }}
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
              <div className="space-y-4 min-w-0">
                {Object.keys(finalArgs).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Terminal size={10} className="text-muted-foreground/40" />
                      <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Input Parameters</h4>
                    </div>
                    <div className="grid gap-1.5">
                      {Object.entries(finalArgs).map(([key, value]) => (
                        <div key={key} className="group overflow-hidden rounded-lg border border-border/40 bg-muted/10 transition-colors hover:border-border/80">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedArgs(p => ({ ...p, [key]: !p[key] })); }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left"
                          >
                            <span className="font-mono text-[11px] font-semibold text-primary/80 group-hover:text-primary transition-colors">{key}</span>
                            <ChevronDown size={12} className={cn("text-muted-foreground/40 transition-transform", expandedArgs[key] && "rotate-180")} />
                          </button>
                          {expandedArgs[key] && (
                            <div className="border-t border-border/20 bg-muted/30 dark:bg-zinc-950 p-3 shadow-inner">
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
                    <div className="flex items-center gap-2 px-1">
                      <CircleCheckBigIcon size={10} className="text-emerald-500/50" />
                      <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Execution Result</h4>
                    </div>
                    <div className="rounded-lg border border-emerald-500/10 bg-muted/30 dark:bg-zinc-950 p-4 shadow-inner overflow-x-auto">
                      <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground/80 dark:text-emerald-400/90 selection:bg-emerald-500/20">
                        {typeof toolCall.result === "string" ? toolCall.result : JSON.stringify(toolCall.result, null, 2)}
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
