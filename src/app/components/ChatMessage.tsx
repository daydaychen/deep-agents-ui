"use client";

import { MarkdownContent } from "@/app/components/MarkdownContent";
import { SubAgentIndicator } from "@/app/components/SubAgentIndicator";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import type { StateType } from "@/app/hooks/useChat";
import type {
  ActionRequest,
  ReviewConfig,
  SubAgent,
  ToolCall,
} from "@/app/types/types";
import {
  extractStringFromMessageContent,
  extractSubAgentContent,
} from "@/app/utils/utils";
import { cn } from "@/lib/utils";
import { Message } from "@langchain/langgraph-sdk";
import type { MessageMetadata } from "@langchain/langgraph-sdk/react";
import React, { useCallback, useMemo, useState } from "react";

interface ChatMessageProps {
  message: Message;
  messageIndex: number;
  toolCalls: ToolCall[];
  isLoading?: boolean;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  ui?: any[];
  stream?: any;
  onResumeInterrupt?: (value: any) => void;
  onRetry?: (message: Message, index: number) => void;
  getMessagesMetadata?: (
    message: Message,
    index?: number
  ) => MessageMetadata<StateType> | undefined;
  setBranch?: (branch: string) => void;
  onEditMessage?: (message: Message, index: number) => void;
  graphId?: string;
}

export const ChatMessage = React.memo<ChatMessageProps>(
  ({
    message,
    toolCalls,
    isLoading,
    actionRequestsMap,
    reviewConfigsMap,
    ui,
    stream,
    onResumeInterrupt,
    graphId,
  }) => {
    const isUser = message.type === "human";
    const messageContent = extractStringFromMessageContent(message);
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;
    const subAgents = useMemo(() => {
      return toolCalls
        .filter((toolCall: ToolCall) => {
          return (
            toolCall.name === "task" &&
            toolCall.args["subagent_type"] &&
            toolCall.args["subagent_type"] !== "" &&
            toolCall.args["subagent_type"] !== null
          );
        })
        .map((toolCall: ToolCall) => {
          const subagentType = (toolCall.args as Record<string, unknown>)[
            "subagent_type"
          ] as string;
          return {
            id: toolCall.id,
            name: toolCall.name,
            subAgentName: subagentType,
            input: toolCall.args,
            output: toolCall.result ? { result: toolCall.result } : undefined,
            status: toolCall.status,
          } as SubAgent;
        });
    }, [toolCalls]);

    const [expandedSubAgents, setExpandedSubAgents] = useState<
      Record<string, boolean>
    >({});
    const isSubAgentExpanded = useCallback(
      (id: string) => expandedSubAgents[id] ?? true,
      [expandedSubAgents]
    );
    const toggleSubAgent = useCallback((id: string) => {
      setExpandedSubAgents((prev) => ({
        ...prev,
        [id]: prev[id] === undefined ? false : !prev[id],
      }));
    }, []);

    // 找出孤立的 action requests（在 actionRequestsMap 中但不在 toolCalls 中）
    const orphanedActionRequests = useMemo(() => {
      if (!actionRequestsMap || actionRequestsMap.size === 0) return [];

      const toolCallNames = new Set(toolCalls.map((tc) => tc.name));
      const orphaned: Array<{
        actionRequest: ActionRequest;
        reviewConfig?: ReviewConfig;
      }> = [];

      actionRequestsMap.forEach((actionRequest, toolName) => {
        if (!toolCallNames.has(toolName)) {
          orphaned.push({
            actionRequest,
            reviewConfig: reviewConfigsMap?.get(toolName),
          });
        }
      });

      return orphaned;
    }, [actionRequestsMap, reviewConfigsMap, toolCalls]);

    // Get metadata for this message to check if it has a parent checkpoint

    return (
      <div
        className={cn(
          "flex w-full max-w-full overflow-x-hidden",
          isUser && "flex-row-reverse"
        )}
      >
        <div
          className={cn(
            "min-w-0 max-w-full",
            isUser ? "max-w-[70%]" : "w-full"
          )}
        >
          {hasContent && (
            <div className={cn("relative flex flex-col gap-2")}>
              <div
                className={cn(
                  "mt-4 overflow-hidden break-words text-sm font-normal leading-[150%]",
                  isUser
                    ? "rounded-xl rounded-br-none border border-border px-3 py-2 text-foreground"
                    : "text-primary"
                )}
                style={
                  isUser
                    ? { backgroundColor: "var(--color-user-message-bg)" }
                    : undefined
                }
              >
                {isUser ? (
                  <div className="flex flex-col gap-2">
                    <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {messageContent}
                    </p>
                  </div>
                ) : hasContent ? (
                  <MarkdownContent content={messageContent} />
                ) : null}
              </div>
            </div>
          )}
          {hasToolCalls && (
            <div className="mt-4 flex w-full flex-col">
              {toolCalls.map((toolCall: ToolCall) => {
                if (toolCall.name === "task") return null;
                const toolCallGenUiComponent = ui?.find(
                  (u) => u.metadata?.tool_call_id === toolCall.id
                );
                const actionRequest = actionRequestsMap?.get(toolCall.name);
                const reviewConfig = reviewConfigsMap?.get(toolCall.name);
                return (
                  <ToolCallBox
                    key={toolCall.id}
                    toolCall={toolCall}
                    uiComponent={toolCallGenUiComponent}
                    stream={stream}
                    graphId={graphId}
                    actionRequest={actionRequest}
                    reviewConfig={reviewConfig}
                    onResume={onResumeInterrupt}
                    isLoading={isLoading}
                  />
                );
              })}
            </div>
          )}
          {!isUser && subAgents.length > 0 && (
            <div className="flex w-fit max-w-full flex-col gap-4">
              {subAgents.map((subAgent) => (
                <div
                  key={subAgent.id}
                  className="flex w-full flex-col gap-2"
                >
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
                      {(() => {
                        const taskActionRequest =
                          actionRequestsMap?.get("task");
                        const taskReviewConfig = reviewConfigsMap?.get("task");
                        const hasInterrupt =
                          taskActionRequest &&
                          subAgent.status === "interrupted";

                        if (hasInterrupt && onResumeInterrupt) {
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
                              <MarkdownContent
                                content={extractSubAgentContent(subAgent.input)}
                              />
                            </div>
                            {subAgent.output && (
                              <>
                                <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
                                  Output
                                </h4>
                                <MarkdownContent
                                  content={extractSubAgentContent(
                                    subAgent.output
                                  )}
                                />
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isUser &&
            orphanedActionRequests.length > 0 &&
            onResumeInterrupt && (
              <div className="mt-4 flex w-full flex-col gap-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Approvals (Subgraph)
                </div>
                {orphanedActionRequests.map(
                  ({ actionRequest, reviewConfig }, index) => (
                    <div key={`orphaned-${actionRequest.name}-${index}`}>
                      <ToolApprovalInterrupt
                        actionRequest={actionRequest}
                        reviewConfig={reviewConfig}
                        onResume={onResumeInterrupt}
                        isLoading={isLoading}
                      />
                    </div>
                  )
                )}
              </div>
            )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";
