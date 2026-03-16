"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

interface AgentThinkingIndicatorProps {
  isActive: boolean;
  className?: string;
}

/**
 * Centralized loading indicator inspired by deepagents_cli's single spinner pattern.
 * Shows a subtle "Agent is thinking..." indicator when the agent is processing.
 *
 * Unlike the distributed loading pattern (spinners in ToolCallBox, SubAgentPanel, etc.),
 * this provides a clear high-level signal that the agent is working, complementing
 * the detailed per-tool status indicators.
 */
export const AgentThinkingIndicator = React.memo<AgentThinkingIndicatorProps>(
  ({ isActive, className }) => {
    const t = useTranslations("chat");

    if (!isActive) return null;

    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground",
          "duration-300 animate-in fade-in slide-in-from-bottom-2",
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={t("agentThinking")}
      >
        <div className="animate-spin">
          <Loader2 className="h-4 w-4 text-[var(--color-success)]" />
        </div>
        <span className="font-medium">{t("agentThinking")}</span>
      </div>
    );
  }
);

AgentThinkingIndicator.displayName = "AgentThinkingIndicator";
