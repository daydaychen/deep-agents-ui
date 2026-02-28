"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import type { ActionRequest, ReviewConfig, SubAgent } from "@/app/types/types";
import { extractSubAgentContent } from "@/app/utils/utils";
import React from "react";

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

    return (
      <div className="border-border-light bg-muted/10 rounded-xl border p-4 shadow-sm mt-2 flex flex-col gap-4">
        <div>
          <h4 className="text-muted-foreground/60 mb-2 text-[10px] font-bold uppercase tracking-widest">
            Input
          </h4>
          <div className="text-sm">
            <MarkdownContent content={extractSubAgentContent(subAgent.input)} />
          </div>
        </div>

        {subAgent.output && (
          <div className="pt-2 border-t border-border/50">
            <h4 className="text-muted-foreground/60 mb-2 text-[10px] font-bold uppercase tracking-widest">
              Output
            </h4>
            <div className="text-sm">
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
