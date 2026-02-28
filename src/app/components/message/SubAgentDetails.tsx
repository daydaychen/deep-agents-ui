"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import type { ActionRequest, ReviewConfig, SubAgent } from "@/app/types/types";
import { extractSubAgentContent } from "@/app/utils/utils";
import React from "react";
import { Terminal, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubAgentDetailsProps {
  subAgent: SubAgent;
  taskActionRequest?: ActionRequest;
  taskReviewConfig?: ReviewConfig;
  onResumeInterrupt?: (value: any) => void;
  isLoading?: boolean;
}

export const SubAgentDetails = React.memo<SubAgentDetailsProps>(
  ({
    subAgent,
    taskActionRequest,
    taskReviewConfig,
    onResumeInterrupt,
    isLoading,
  }) => {
    // Process subagent messages to extract tool calls
    const processedMessages = useProcessedMessages(subAgent.messages || [], undefined);
    
    // Flatten all tool calls from all processed messages
    const allToolCalls = React.useMemo(() => {
      return processedMessages.flatMap(m => m.toolCalls);
    }, [processedMessages]);

    const hasInterrupt =
      taskActionRequest &&
      subAgent.status === "interrupted" &&
      onResumeInterrupt;

    if (hasInterrupt) {
      return (
        <div className="mt-2">
          <ToolApprovalInterrupt
            actionRequest={taskActionRequest}
            reviewConfig={taskReviewConfig}
            onResume={onResumeInterrupt}
            isLoading={isLoading}
          />
        </div>
      );
    }

    const hasToolCalls = allToolCalls.length > 0;

    return (
      <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm">
        {/* Input Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Terminal size={10} className="text-muted-foreground/40" />
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Protocol Input
            </h4>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/50 p-3 text-sm shadow-inner">
            <MarkdownContent content={extractSubAgentContent(subAgent.input)} />
          </div>
        </div>

        {/* Tool Calls Section */}
        {hasToolCalls && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 px-1">
              <ArrowDownRight size={10} className="text-primary/40" />
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-primary/60">
                Execution Trace
              </h4>
            </div>
            <div className="flex flex-col gap-2.5 pl-2 border-l-2 border-primary/10 ml-1.5">
              {allToolCalls.map((toolCall) => (
                <ToolCallBox
                  key={toolCall.id}
                  toolCall={toolCall}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Output Section */}
        {subAgent.output && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-2 px-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
              </div>
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Final Result
              </h4>
            </div>
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-3 text-sm shadow-inner">
              <MarkdownContent
                content={extractSubAgentContent(subAgent.output)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

SubAgentDetails.displayName = "SubAgentDetails";
