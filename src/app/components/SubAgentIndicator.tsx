"use client";

import type { SubAgent } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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

const getStatusIcon = (status: SubAgent["status"]) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle2
          size={16}
          className="text-green-600"
        />
      );
    case "error":
      return (
        <AlertCircle
          size={16}
          className="text-destructive"
        />
      );
    case "pending":
    case "active":
      return (
        <Loader2
          size={16}
          className="animate-spin text-blue-600"
        />
      );
    default:
      return (
        <Bot
          size={16}
          className="text-muted-foreground"
        />
      );
  }
};

const getStatusBorderColor = (status: SubAgent["status"]) => {
  switch (status) {
    case "completed":
      return "border-l-green-600";
    case "error":
      return "border-l-destructive";
    case "pending":
    case "active":
      return "border-l-blue-600";
    case "interrupted":
      return "border-l-orange-500";
    default:
      return "border-l-border";
  }
};

export const SubAgentIndicator = React.memo<SubAgentIndicatorProps>(
  ({ subAgent, onToggleExpand, onShowLogs, isExpanded = false, isActiveInSidebar = false }) => {
    const status = subAgent.status || "pending";
    const name = subAgent.agentName && subAgent.agentName !== subAgent.subAgentName
                  ? `${subAgent.agentName} (${subAgent.subAgentName})`
                  : subAgent.agentName || subAgent.subAgentName;

    // Deep Arg Extraction for SubAgent Input Preview
    const argsPreview = useMemo(() => {
      const input = subAgent.input || {};
      
      // 1. Priority: If 'description' exists, show it directly (most meaningful)
      if (input.description && typeof input.description === 'string') {
        const desc = input.description;
        return desc.length > 300 ? desc.substring(0, 300) + "..." : desc;
      }

      // 2. Fallback: Filter out redundant 'subagent_type' and join others
      const entries = Object.entries(input).filter(([key]) => key !== 'subagent_type');
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
        return preview.length > 300 ? preview.substring(0, 300) + "..." : preview;
      } catch {
        return "";
      }
    }, [subAgent.input]);

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border shadow-sm transition-all duration-300",
          status === "completed" ? "border-emerald-500/20 bg-emerald-500/[0.02]" : 
          status === "error" ? "border-destructive/20 bg-destructive/[0.02]" : 
          status === "active" ? "border-blue-500/20 bg-blue-500/[0.02] ring-1 ring-blue-500/10" : 
          status === "interrupted" ? "border-orange-500/20 bg-orange-500/[0.02]" : "border-border bg-card",
          isActiveInSidebar && "ring-2 ring-primary/20 border-primary/30 bg-primary/[0.03] shadow-md shadow-primary/5"
        )}
      >
        <div className="flex items-center gap-1 pr-1.5">
          {/* Main Click Area */}
          <button
            type="button"
            onClick={onToggleExpand}
            className={cn(
              "flex flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 min-w-0",
              "hover:bg-muted/30 active:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-inner transition-transform duration-500",
                status === "completed" ? "bg-emerald-500/10 border-emerald-500/20" : 
                status === "error" ? "bg-destructive/10 border-destructive/20" : 
                status === "active" ? "bg-blue-500/10 border-blue-500/20 scale-105" : 
                status === "interrupted" ? "bg-orange-500/10 border-orange-500/20" : "bg-muted border-border"
              )}>
                {getStatusIcon(status)}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                  <span className="text-[13px] font-bold tracking-tight text-foreground/90 shrink-0">
                    {name}
                  </span>
                  {argsPreview && (
                    <div className="flex-1 min-w-0 flex items-center">
                      <div className="truncate font-mono text-[9px] leading-none text-muted-foreground/50 bg-muted/20 rounded px-1.5 py-1 border border-border/10">
                        {argsPreview}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                  {status === "active" ? "Sub-Process Active" : `Status: ${status}`}
                </span>
              </div>
            </div>
            <div className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/60 transition-transform duration-300",
              isExpanded && "rotate-180"
            )}>
              <ChevronDown size={12} />
            </div>
          </button>

          {/* Logs Button */}
          <div className="flex items-center border-l border-border/20 pl-1 py-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onShowLogs();
              }}
              className={cn(
                "h-9 w-9 rounded-xl transition-all duration-300",
                isActiveInSidebar 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 scale-105" 
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              )}
              title="View Internal Core Trace"
            >
              <ScrollText size={16} className={cn(isActiveInSidebar && "animate-pulse")} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
