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
import React from "react";

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
    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border border-l-[3px] border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md",
          getStatusBorderColor(subAgent.status),
          isActiveInSidebar && "ring-1 ring-primary/20 bg-primary/5"
        )}
      >
        <div className="flex items-center">
          {/* Main Click Area - Toggles local Input/Output visibility */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex flex-1 items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(subAgent.status)}
              <span className="font-sans text-sm font-bold tracking-tight text-foreground">
                {subAgent.agentName && subAgent.agentName !== subAgent.subAgentName
                  ? `${subAgent.agentName} (${subAgent.subAgentName})`
                  : subAgent.agentName || subAgent.subAgentName}
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
          </button>

          {/* Logs Button - Toggles the Global Sidebar Detail */}
          <div className="flex items-center px-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onShowLogs();
              }}
              className={cn(
                "h-8 w-8 rounded-lg transition-all",
                isActiveInSidebar 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="View Internal Logs"
            >
              <ScrollText size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
