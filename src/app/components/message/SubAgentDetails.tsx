"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { MessageContent } from "@/app/components/message/MessageContent";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import type { ActionRequest, ReviewConfig, SubAgent } from "@/app/types/types";
import {
  extractStringFromMessageContent,
  extractSubAgentContent,
} from "@/app/utils/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

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
    // Process subagent messages to extract tool calls (must be called before any early returns)
    const processedSubAgentMessages = useProcessedMessages(
      subAgent.messages || [],
      undefined,
      undefined
    );

    const hasInterrupt =
      taskActionRequest &&
      subAgent.status === "interrupted" &&
      onResumeInterrupt;

    // State to control messages section expansion
    const [isMessagesExpanded, setIsMessagesExpanded] = useState(true);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-collapse messages when output appears
    useEffect(() => {
      if (subAgent.output) {
        setIsMessagesExpanded(false);
      }
    }, [subAgent.output]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
      if (isMessagesExpanded && messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, [processedSubAgentMessages, isMessagesExpanded]);

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

    const hasMessages = subAgent.messages && subAgent.messages.length > 0;

    return (
      <div className="border-border-light bg-surface rounded-md border p-4 shadow-sm">
        <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
          Input
        </h4>
        <div className="mb-4">
          <MarkdownContent content={extractSubAgentContent(subAgent.input)} />
        </div>

        {hasMessages && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-primary/70 text-xs font-semibold uppercase tracking-wider">
                SubAgent Messages
              </h4>
              <button
                onClick={() => setIsMessagesExpanded(!isMessagesExpanded)}
                className="text-primary/70 flex items-center gap-1 text-xs transition-colors hover:text-primary"
                aria-label={
                  isMessagesExpanded ? "Collapse messages" : "Expand messages"
                }
              >
                {isMessagesExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Expand
                  </>
                )}
              </button>
            </div>
            {isMessagesExpanded && (
              <div
                ref={messagesContainerRef}
                className="border-border-light mb-4 max-h-96 space-y-4 overflow-y-auto rounded border bg-muted/30 p-4"
              >
                {processedSubAgentMessages.map((data, index) => {
                  const isUser = data.message.type === "human";
                  const messageContent = extractStringFromMessageContent(
                    data.message
                  );
                  const hasContent =
                    messageContent && messageContent.trim() !== "";
                  const hasToolCalls = data.toolCalls.length > 0;

                  return (
                    <div
                      key={data.message.id || index}
                      className="space-y-2"
                    >
                      {hasContent && (
                        <div className="text-sm">
                          <MessageContent
                            content={messageContent}
                            isUser={isUser}
                          />
                        </div>
                      )}
                      {hasToolCalls && (
                        <div className="flex flex-col gap-3">
                          {data.toolCalls.map((toolCall) => (
                            <ToolCallBox
                              key={toolCall.id}
                              toolCall={toolCall}
                              isLoading={false}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

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
