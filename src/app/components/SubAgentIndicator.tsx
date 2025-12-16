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
} from "lucide-react";
import React from "react";

interface SubAgentIndicatorProps {
  subAgent: SubAgent;
  onClick: () => void;
  isExpanded?: boolean;
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
  ({ subAgent, onClick, isExpanded = true }) => {
    return (
      <div
        className={cn(
          "w-fit max-w-[70vw] overflow-hidden rounded-lg border border-l-[3px] border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md",
          getStatusBorderColor(subAgent.status)
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="flex w-full items-center justify-between gap-2 border-none px-4 py-2 text-left shadow-none outline-none transition-colors duration-200"
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(subAgent.status)}
              <span className="font-sans text-[15px] font-bold leading-[140%] tracking-[-0.6px] text-[#3F3F46]">
                {subAgent.subAgentName}
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp
                size={14}
                className="shrink-0 text-[#70707B]"
              />
            ) : (
              <ChevronDown
                size={14}
                className="shrink-0 text-[#70707B]"
              />
            )}
          </div>
        </Button>
      </div>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
