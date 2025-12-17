"use client";

import { ChatMessage } from "@/app/components/ChatMessage";
import { MessageToolbar } from "@/app/components/MessageToolbar";
import { ChatInput } from "@/app/components/chat/ChatInput";
import { TasksSection } from "@/app/components/chat/TasksSection";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import type { ActionRequest, ReviewConfig } from "@/app/types/types";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { Assistant } from "@langchain/langgraph-sdk";
import { AlertCircle } from "lucide-react";
import React, { FormEvent, useCallback, useMemo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}

export const ChatInterface = React.memo<ChatInterfaceProps>(({ assistant }) => {
  const [metaOpen, setMetaOpen] = useState<"tasks" | "files" | null>(null);
  const [input, setInput] = useState("");
  const { scrollRef, contentRef } = useStickToBottom({
    initial: "instant",
    resize: "instant",
  });

  const {
    stream,
    messages,
    todos,
    files,
    ui,
    setFiles,
    isLoading,
    isThreadLoading,
    interrupt,
    error,
    subagentMessagesMap,
    getMessagesMetadata,
    sendMessage,
    stopStream,
    resumeInterrupt,
    retryFromMessage,
    setBranch,
    editMessage,
    getMessageBranchInfo,
  } = useChatContext();

  const submitDisabled = isLoading || !assistant;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      const messageText = input.trim();
      if (!messageText || isLoading || submitDisabled) return;
      sendMessage(messageText);
      setInput("");
    },
    [input, isLoading, sendMessage, setInput, submitDisabled]
  );

  // Use the extracted hook for processing messages
  const processedMessages = useProcessedMessages(messages, interrupt);

  // Parse out any action requests or review configs from the interrupt
  const actionRequestsMap: Map<string, ActionRequest> | null = useMemo(() => {
    const actionRequests =
      interrupt?.value && (interrupt.value as any)["action_requests"];
    if (!actionRequests) return new Map<string, ActionRequest>();
    return new Map(actionRequests.map((ar: ActionRequest) => [ar.name, ar]));
  }, [interrupt]);

  const reviewConfigsMap: Map<string, ReviewConfig> | null = useMemo(() => {
    const reviewConfigs =
      interrupt?.value && (interrupt.value as any)["review_configs"];
    if (!reviewConfigs) return new Map<string, ReviewConfig>();
    return new Map(
      reviewConfigs.map((rc: ReviewConfig) => [rc.action_name, rc])
    );
  }, [interrupt]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        ref={scrollRef}
      >
        <div
          className="mx-auto w-full max-w-[1024px] px-6 pb-6 pt-4"
          ref={contentRef}
        >
          {isThreadLoading && processedMessages.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              {processedMessages.map((data, index) => {
                const messageUi = ui?.filter(
                  (u: any) => u.metadata?.message_id === data.message.id
                );
                const isLastMessage = index === processedMessages.length - 1;
                const messageContent = extractStringFromMessageContent(
                  data.message
                );
                const isUser = data.message.type === "human";

                // Get branch information for this message using the new helper function
                const branchInfo = getMessageBranchInfo?.(data.message, index);
                const branchOptions = branchInfo?.branchOptions || [];
                const currentBranchIndex = branchInfo?.currentBranchIndex ?? 0;
                const canRetry = branchInfo?.canRetry;

                return (
                  <div
                    key={data.message.id}
                    className="flex flex-col gap-1"
                  >
                    <ChatMessage
                      message={data.message}
                      messageIndex={index}
                      toolCalls={data.toolCalls}
                      isLoading={isLoading}
                      actionRequestsMap={
                        isLastMessage ? actionRequestsMap : undefined
                      }
                      reviewConfigsMap={
                        isLastMessage ? reviewConfigsMap : undefined
                      }
                      ui={messageUi}
                      stream={stream}
                      onResumeInterrupt={resumeInterrupt}
                      onRetry={retryFromMessage}
                      getMessagesMetadata={getMessagesMetadata}
                      setBranch={setBranch}
                      graphId={assistant?.graph_id}
                      subagentMessagesMap={subagentMessagesMap}
                    />
                    {/* Message Toolbar - placed below the message, aligned with message type */}
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
                        <MessageToolbar
                          messageContent={messageContent}
                          isUser={isUser}
                          isLoading={isLoading}
                          onRetry={
                            canRetry
                              ? () => retryFromMessage(data.message, index)
                              : undefined
                          }
                          showRetry={!!canRetry}
                          onEdit={
                            editMessage
                              ? (editedMessage) =>
                                  editMessage(editedMessage, index)
                              : undefined
                          }
                          showEdit={false}
                          branchOptions={branchOptions}
                          currentBranchIndex={currentBranchIndex}
                          onSelectBranch={setBranch}
                          showBranchSwitcher={
                            !!setBranch && branchOptions.length > 1
                          }
                          className="px-2"
                          message={data.message}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-4"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>错误</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-background">
        <div
          className={cn(
            "mx-4 mb-6 flex flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background",
            "mx-auto w-[calc(100%-32px)] max-w-[1024px] transition-colors duration-200 ease-in-out"
          )}
        >
          <TasksSection
            todos={todos}
            files={files}
            setFiles={setFiles}
            isLoading={isLoading}
            interrupt={interrupt}
            metaOpen={metaOpen}
            setMetaOpen={setMetaOpen}
          />
          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            submitDisabled={submitDisabled}
            onSubmit={handleSubmit}
            onStop={stopStream}
          />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
