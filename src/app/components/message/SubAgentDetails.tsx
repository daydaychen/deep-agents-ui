"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import type {
  ActionRequest,
  ReviewConfig,
  SubAgent,
} from "@/app/types/types";
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
      taskActionRequest && subAgent.status === "interrupted" && onResumeInterrupt;

    if (hasInterrupt) {
      return (
        <ToolApprovalInterrupt
          actionRequest={taskActionRequest}
          reviewConfig={taskReviewConfig}
          onResume={onResumeInterrupt}
          isLoading={isLoading}
        />
      );
    }

    return (
      <div className="bg-surface border-border-light rounded-md border p-4">
        <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
          Input
        </h4>
        <div className="mb-4">
          <MarkdownContent content={extractSubAgentContent(subAgent.input)} />
        </div>
        {subAgent.output && (
          <>
            <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
              Output
            </h4>
            <MarkdownContent
              content={extractSubAgentContent(subAgent.output)}
            />
          </>
        )}
      </div>
    );
  }
);

SubAgentDetails.displayName = "SubAgentDetails";
