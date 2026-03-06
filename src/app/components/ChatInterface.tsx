"use client";

import { ChatMessage } from "@/app/components/ChatMessage";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { ChatInput } from "@/app/components/chat/ChatInput";
import { TasksSection } from "@/app/components/chat/TasksSection";
import { SubAgentPanel } from "@/app/components/message/SubAgentPanel";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { useThrottledValue } from "@/app/hooks/useThrottledValue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useChatActions, useChatState } from "@/providers/chat-context";
import { AlertCircle } from "lucide-react";
import React, { FormEvent, useCallback, useMemo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

const loadingSkeletons = [1, 2, 3];

export const ChatInterface = React.memo(() => {
  const [metaOpen, setMetaOpen] = useState<"tasks" | "files" | null>(null);
  const [input, setInput] = useState("");
  const sidebarPanelRef = React.useRef<any>(null);
  const { scrollRef, contentRef } = useStickToBottom({
    initial: "instant",
    resize: "instant",
  });

  const {
    messages,
    todos,
    files,
    isLoading,
    error,
    subagentMessagesMap,
    activeSubAgentId,
    getMessageBranchInfo,
  } = useChatState();

  const {
    sendMessage,
    stopStream,
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
        if (sidebarPanelRef.current.isCollapsed()) {
          sidebarPanelRef.current.expand();
        }
      } else {
        sidebarPanelRef.current.collapse();
      }
    }
  }, [isPanelOpen, activeSubAgentId]);

  const submitDisabled = isLoading;
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

  // Throttle messages updates to 100ms during streaming
  const throttledMessages = useThrottledValue(messages, isLoading ? 100 : 0);

  // Use the extracted hook for processing messages
  const processedMessages = useProcessedMessages(
    throttledMessages,
    subagentMessagesMap
  );

  // Extract all subagents from all messages for the panel lookup
  const allSubAgents = useMemo(() => {
    return processedMessages.flatMap((m) => m.subAgents);
  }, [processedMessages]);

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
                  "mx-auto w-full transition-[padding,max-width,opacity,transform] duration-300 ease-in-out px-3 pb-4 pt-2 md:px-4 max-w-[900px]"
                )}
                ref={contentRef}
              >
                {processedMessages.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground/40">
                    <p className="text-sm font-medium italic">Send a message to start...</p>
                  </div>
                ) : processedMessages.length === 0 && isLoading ? (
                  <div className="flex flex-col gap-4 p-6">
                    {loadingSkeletons.map((i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
                          <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="space-y-1.5 ml-10">
                          <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
                          <div className="h-3.5 w-[80%] bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {processedMessages.map((data, index) => {
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
                              onRetry={retryFromMessage}
                              onEdit={editMessage}
                              setBranch={setBranch}
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
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Input Container */}
            <div className="flex-shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-3 sm:px-4">
              <div className="mx-auto max-w-[800px] flex flex-col overflow-hidden rounded-[26px] border border-border shadow-2xl shadow-primary/5 bg-background transition-[border-color,box-shadow,transform] duration-500 focus-within:border-primary/30 focus-within:shadow-primary/10">
                <TasksSection
                  todos={todos}
                  files={files}
                  setFiles={setFiles}
                  isLoading={isLoading}
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
