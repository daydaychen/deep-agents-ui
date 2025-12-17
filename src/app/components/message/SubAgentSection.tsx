"use client";

import { SubAgentIndicator } from "@/app/components/SubAgentIndicator";
import { SubAgentDetails } from "@/app/components/message/SubAgentDetails";
import type { ActionRequest, ReviewConfig, SubAgent } from "@/app/types/types";
import { Message } from "@langchain/langgraph-sdk";
import React from "react";

interface SubAgentSectionProps {
  subAgents: SubAgent[];
  isSubAgentExpanded: (id: string) => boolean;
  toggleSubAgent: (id: string) => void;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  onResumeInterrupt?: (value: any) => void;
  isLoading?: boolean;
  subagentMessagesMap?: Map<string, Message[]>;
}

export const SubAgentSection = React.memo<SubAgentSectionProps>(
  ({
    subAgents,
    isSubAgentExpanded,
    toggleSubAgent,
    actionRequestsMap,
    reviewConfigsMap,
    onResumeInterrupt,
    isLoading,
    subagentMessagesMap,
  }) => {
    if (subAgents.length === 0) return null;

    return (
      <div className="mt-6 flex w-fit max-w-full flex-col gap-6">
        {subAgents.map((subAgent, index) => (
          <div
            key={subAgent.id}
            className="flex w-full flex-col gap-2"
          >
            {index > 0 && (
              <div className="-mt-3 mb-3 border-t border-border/30" />
            )}
            <div className="flex items-end gap-2">
              <div className="w-[calc(100%-100px)]">
                <SubAgentIndicator
                  subAgent={subAgent}
                  onClick={() => toggleSubAgent(subAgent.id)}
                  isExpanded={isSubAgentExpanded(subAgent.id)}
                />
              </div>
            </div>
            {isSubAgentExpanded(subAgent.id) && (
              <div className="w-full max-w-full">
                <SubAgentDetails
                  subAgent={subAgent}
                  taskActionRequest={actionRequestsMap?.get("task")}
                  taskReviewConfig={reviewConfigsMap?.get("task")}
                  onResumeInterrupt={onResumeInterrupt}
                  isLoading={isLoading}
                  subagentMessages={subagentMessagesMap?.get(subAgent.id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

SubAgentSection.displayName = "SubAgentSection";
