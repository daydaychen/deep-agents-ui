"use client";

import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ActionRequest, ReviewConfig, ToolCall } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
        return preview.length > 150 ? preview.substring(0, 150) + "..." : preview;
      } catch {
        return "";
      }
    }, [finalArgs]);

    const name = toolCall.name || "Unknown Tool";
    const status = toolCall.status || "completed";
    const hasContent = toolCall.result || Object.keys(finalArgs).length > 0;

    const statusIcon = useMemo(() => {
      switch (status) {
        case "completed": return <CircleCheckBigIcon size={14} className="text-green-600" />;
        case "error": return <AlertCircle size={14} className="text-destructive" />;
        case "pending": return <Loader2 size={14} className="animate-spin text-blue-600" />;
        case "interrupted": return <StopCircle size={14} className="text-orange-500" />;
        default: return <Terminal size={14} className="text-muted-foreground" />;
      }
    }, [status]);

    return (
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-xl border border-l-[3px] border-border shadow-sm bg-card transition-all",
          status === "completed" ? "border-l-green-600" : 
          status === "error" ? "border-l-destructive" : 
          status === "pending" ? "border-l-blue-600" : 
          status === "interrupted" ? "border-l-orange-500" : "border-l-border",
          isExpanded && hasContent && "bg-accent/5"
        )}
      >
        {/* Header - Replaced Div with Button for accessibility */}
        <button 
          onClick={() => hasContent && setIsExpanded(!isExpanded)}
          disabled={!hasContent}
          aria-expanded={isExpanded}
          className={cn(
            "grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 min-w-0 w-full text-left transition-colors",
            hasContent ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
          )}
        >
          {/* Tool Name */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0 max-w-[200px]">
            <div className="shrink-0">{statusIcon}</div>
            <span className="text-sm font-bold tracking-tight text-foreground truncate">
              {name}
            </span>
          </div>
          
          {/* Arguments Preview - High priority visibility */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="truncate text-[11px] font-mono text-muted-foreground/80">
              {argsPreview || <span className="italic opacity-30 font-sans tracking-normal">no arguments</span>}
            </div>
          </div>

          {/* Icon */}
          <div className="shrink-0 ml-1">
            {hasContent && (
              isExpanded ? <ChevronUp size={16} className="text-muted-foreground/60" /> : <ChevronDown size={16} className="text-muted-foreground/60" />
            )}
          </div>
        </button>

        {isExpanded && hasContent && (
          <div className="px-4 pb-4 border-t border-border/10">
            {uiComponent && stream && graphId ? (
              <div className="mt-4 min-w-0 overflow-hidden">
                <LoadExternalComponent
                  key={uiComponent.id}
                  stream={stream}
                  message={uiComponent}
                  namespace={graphId}
                  meta={{ status, args: finalArgs, result: toolCall.result ?? "No Result Yet" }}
                />
              </div>
            ) : actionRequest && onResume ? (
              <div className="mt-4 min-w-0">
                <ToolApprovalInterrupt
                  actionRequest={actionRequest}
                  reviewConfig={reviewConfig}
                  onResume={onResume}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="min-w-0">
                {Object.keys(finalArgs).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Arguments</h4>
                    <div className="space-y-1.5">
                      {Object.entries(finalArgs).map(([key, value]) => (
                        <div key={key} className="rounded-md border border-border/50 bg-background/30 overflow-hidden shadow-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedArgs(p => ({ ...p, [key]: !p[key] })); }}
                            aria-expanded={expandedArgs[key]}
                            className="flex w-full items-center justify-between bg-muted/20 p-2.5 text-left text-xs font-medium hover:bg-muted/40 transition-colors"
                          >
                            <span className="font-mono text-primary/70 truncate pr-2">{key}</span>
                            {expandedArgs[key] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          {expandedArgs[key] && (
                            <div className="border-t border-border/30 bg-muted/5 p-3 overflow-x-auto">
                              <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground/90">
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
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Result</h4>
                    <div className="rounded-md border border-border/50 bg-muted/10 p-3 shadow-inner overflow-x-auto">
                      <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground/90">
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
