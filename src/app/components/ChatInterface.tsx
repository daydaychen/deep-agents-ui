"use client";

import { ChatMessage } from "@/app/components/ChatMessage";
import { ChatInput } from "@/app/components/chat/ChatInput";
import { TasksSection } from "@/app/components/chat/TasksSection";
import { SubAgentPanel } from "@/app/components/message/SubAgentPanel";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { useSubAgents } from "@/app/hooks/message/useSubAgents";
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
import React, { FormEvent, useCallback, useMemo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}
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

  // Handle manual panel control for smooth transitions
  React.useEffect(() => {
    if (sidebarPanelRef.current) {
      if (isPanelOpen) {
        sidebarPanelRef.current.expand();
      } else {
        sidebarPanelRef.current.collapse();
      }
    }
  }, [isPanelOpen]);

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

  // Extract all subagents from all messages for the panel lookup
  const allToolCalls = useMemo(() => {
    return processedMessages.flatMap((m) => m.toolCalls);
  }, [processedMessages]);
  const allSubAgents = useSubAgents(allToolCalls, subagentMessagesMap);

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
                  "mx-auto w-full transition-[padding,max-width,opacity,transform] duration-300 ease-in-out px-4 pb-6 pt-4 md:px-6 max-w-[850px]"
                )}
                ref={contentRef}
              >
                {isThreadLoading && processedMessages.length === 0 ? (
                  <div className="flex flex-col gap-6 p-8">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="space-y-2 ml-11">
                          <div className="h-4 w-full bg-muted animate-pulse rounded" />
                          <div className="h-4 w-[80%] bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {processedMessages.map((data, index) => {
                      const messageUi = ui?.filter(
                        (u: any) => u.metadata?.message_id === data.message.id
                      );
                      const isLastMessage = index === processedMessages.length - 1;
                      
                      // Get branch information for this message
                      const branchInfo = getMessageBranchInfo?.(data.message, index);
                      const branchOptions = branchInfo?.branchOptions || [];
                      const currentBranchIndex = branchInfo?.currentBranchIndex ?? 0;
                      const canRetry = branchInfo?.canRetry;

                      return (
                        <div key={data.message.id} className="flex flex-col gap-1">
                          <ChatMessage
                            message={data.message}
                            messageIndex={index}
                            toolCalls={data.toolCalls}
                            isLoading={isLoading}
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
                            subagentMessagesMap={subagentMessagesMap}
                            branchOptions={branchOptions}
                            currentBranchIndex={currentBranchIndex}
                            canRetry={!!canRetry}
                            activeSubAgentId={activeSubAgentId}
                            setActiveSubAgentId={setActiveSubAgentId}
                          />
                        </div>
                      );
                    })}
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>错误</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Input Container */}
            <div className="flex-shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-4">
              <div className="mx-auto max-w-[800px] flex flex-col overflow-hidden rounded-[26px] border border-border shadow-2xl shadow-primary/5 bg-background transition-[border-color,box-shadow] duration-500 focus-within:border-primary/30 focus-within:shadow-primary/10">
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
