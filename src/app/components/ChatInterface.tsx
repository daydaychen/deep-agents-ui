"use client";

import { ChatMessage } from "@/app/components/ChatMessage";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { ChatInput } from "@/app/components/chat/ChatInput";
import { TasksSection } from "@/app/components/chat/TasksSection";
import { SubAgentPanel } from "@/app/components/message/SubAgentPanel";
import { MessageSkeleton } from "@/app/components/ui/message-skeleton";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { useThrottledValue } from "@/app/hooks/useThrottledValue";
import type { ActionRequest, ReviewConfig } from "@/app/types/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useChatActions, useChatState } from "@/providers/chat-context";
import { Assistant } from "@langchain/langgraph-sdk";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { FormEvent, useCallback, useMemo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}

const loadingSkeletons = [1, 2, 3];

export const ChatInterface = React.memo<ChatInterfaceProps>(({ assistant }) => {
  const [metaOpen, setMetaOpen] = useState<"tasks" | "files" | null>(null);
  const [input, setInput] = useState("");
  const sidebarPanelRef = React.useRef<any>(null);
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
    isLoading,
    isThreadLoading,
    interrupt,
    error,
    subagentMessagesMap,
    activeSubAgentId,
    getMessagesMetadata,
    getMessageBranchInfo,
  } = useChatState();

  const {
    sendMessage,
    stopStream,
    resumeInterrupt,
    retryFromMessage,
    setBranch,
    editMessage,
    setActiveSubAgentId,
    setFiles,
  } = useChatActions();

  const isPanelOpen = !!activeSubAgentId;

  // Handle manual panel control for smooth transitions and forced collapses
  React.useEffect(() => {
    if (sidebarPanelRef.current) {
      if (isPanelOpen) {
        // Only expand if currently collapsed or size is 0
        if (sidebarPanelRef.current.isCollapsed()) {
          sidebarPanelRef.current.expand();
        }
      } else {
        // Explicitly collapse on thread switch or when ID is null
        sidebarPanelRef.current.collapse();
      }
    }
  }, [isPanelOpen, activeSubAgentId]); // Include activeSubAgentId to catch every state change

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

  // Throttle messages updates to 100ms during streaming to prevent UI stutter/crashing
  // Use messages immediately when NOT loading to ensure responsive history loading
  const throttledMessages = useThrottledValue(messages, isLoading ? 100 : 0);

  // Use the extracted hook for processing messages
  const processedMessages = useProcessedMessages(
    throttledMessages,
    subagentMessagesMap,
    interrupt
  );

  // Extract all subagents from all messages for the panel lookup
  const allSubAgents = useMemo(() => {
    return processedMessages.flatMap((m) => m.subAgents);
  }, [processedMessages]);

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

  // Memoize UI components by message ID for O(1) lookup instead of O(n) filter per message
  const uiByMessageId = useMemo(() => {
    if (!ui) return new Map<string, any[]>();
    const map = new Map<string, any[]>();
    for (const u of ui) {
      const messageId = u.metadata?.message_id;
      if (messageId) {
        const existing = map.get(messageId) || [];
        existing.push(u);
        map.set(messageId, existing);
      }
    }
    return map;
  }, [ui]);

  const tCommon = useTranslations("common");

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel
          defaultSize={100}
          minSize={30}
        >
          <div className="relative flex h-full flex-col overflow-hidden">
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-pretty"
              ref={scrollRef}
            >
              <div
                className={cn(
                  "mx-auto w-full transition-[padding,max-width,opacity] duration-200 ease-in-out px-3 pb-4 pt-2 md:px-4 max-w-[900px]"
                )}
                ref={contentRef}
              >
                {isThreadLoading && processedMessages.length === 0 ? (
                  <div className="flex flex-col gap-4 p-6">
                    {loadingSkeletons.map((i) => (
                      <MessageSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <>
                    {processedMessages.map((data, index) => {
                      // O(1) lookup from memoized map instead of O(n) filter
                      const messageUi = data.message.id ? uiByMessageId.get(data.message.id) : undefined;
                      const isLastMessage = index === processedMessages.length - 1;
                      const isStreaming = isLastMessage && isLoading;

                      // Get branch information for this message
                      const branchInfo = getMessageBranchInfo?.(data.message, index);
                      const branchOptions = branchInfo?.branchOptions || [];
                      const currentBranchIndex = branchInfo?.currentBranchIndex ?? 0;
                      const canRetry = branchInfo?.canRetry;

                      return (
                        <div key={data.message.id} className="flex flex-col">
                          <ErrorBoundary className="mb-4">
                            <ChatMessage
                              message={data.message}
                              messageIndex={index}
                              toolCalls={data.toolCalls}
                              subAgents={data.subAgents}
                              isLoading={isLoading}
                              isStreaming={isStreaming}
                              actionRequestsMap={isLastMessage ? actionRequestsMap : undefined}
                              reviewConfigsMap={isLastMessage ? reviewConfigsMap : undefined}
                              ui={messageUi}
                              stream={stream}
                              onResumeInterrupt={resumeInterrupt}
                              onRetry={retryFromMessage}
                              onEdit={editMessage}
                              getMessagesMetadata={getMessagesMetadata}
                              setBranch={setBranch}
                              graphId={assistant?.graph_id}
                              branchOptions={branchOptions}
                              currentBranchIndex={currentBranchIndex}
                              canRetry={!!canRetry}
                              activeSubAgentId={activeSubAgentId}
                              setActiveSubAgentId={setActiveSubAgentId}
                            />
                          </ErrorBoundary>
                        </div>
                      );
                    })}
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{tCommon("error")}</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Input Container */}
            <div className="flex-shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-3 sm:px-4">
              <div className="mx-auto max-w-[800px] flex flex-col overflow-hidden rounded-[26px] border border-border shadow-2xl shadow-primary/5 bg-background transition-[border-color,box-shadow] duration-200 focus-within:border-primary/30 focus-within:shadow-primary/10">
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
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className={cn(
            "bg-border/50 transition-opacity duration-300",
            !isPanelOpen && "opacity-0 w-0 pointer-events-none"
          )}
        />

        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={40}
          minSize={25}
          collapsible
          onCollapse={() => setActiveSubAgentId(null)}
          className="bg-background"
        >
          <SubAgentPanel
            subAgentId={activeSubAgentId}
            subAgents={allSubAgents}
            subagentMessagesMap={subagentMessagesMap}
            onClose={() => setActiveSubAgentId(null)}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
