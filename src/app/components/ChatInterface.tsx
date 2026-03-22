"use client";

import { Assistant } from "@langchain/langgraph-sdk";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";
import { AgentThinkingIndicator } from "@/app/components/AgentThinkingIndicator";
import { ChatMessage } from "@/app/components/ChatMessage";
import { ChatInput } from "@/app/components/chat/ChatInput";
import { TasksSection } from "@/app/components/chat/TasksSection";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { InspectorPanel } from "@/app/components/inspector/InspectorPanel";
import { InspectorProvider } from "@/app/components/inspector/InspectorProvider";
import { useInspector } from "@/app/components/inspector/inspector-context";
import { SidePanelHeader, type SidePanelView } from "@/app/components/inspector/SidePanelHeader";
import { SubAgentPanel } from "@/app/components/message/SubAgentPanel";
import { MessageSkeleton } from "@/app/components/ui/message-skeleton";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { useThrottledValue } from "@/app/hooks/useThrottledValue";
import type {
  ActionRequest,
  ReviewConfig,
  ToolApprovalInterruptData,
  UiComponent,
} from "@/app/types/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useChatStoreShallow } from "@/providers/chat-store-provider";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}

const loadingSkeletons = [1, 2, 3];

const loadingSkeletonElements = (
  <div className="flex flex-col gap-4 p-6">
    {loadingSkeletons.map((i) => (
      <MessageSkeleton key={i} />
    ))}
  </div>
);

interface ChatInterfaceInnerProps {
  assistant: Assistant | null;
  sidePanelView: SidePanelView | null;
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView | null>>;
  agentTabBadge: boolean;
  setAgentTabBadge: React.Dispatch<React.SetStateAction<boolean>>;
  inspectorTabBadge: boolean;
  setInspectorTabBadge: React.Dispatch<React.SetStateAction<boolean>>;
  onCloseSidePanel: () => void;
}

// Inner component that consumes Inspector context
const ChatInterfaceInner = React.memo<ChatInterfaceInnerProps>(
  ({
    assistant,
    sidePanelView,
    setSidePanelView,
    agentTabBadge,
    setAgentTabBadge,
    inspectorTabBadge,
    setInspectorTabBadge,
    onCloseSidePanel,
  }) => {
    const [metaOpen, setMetaOpen] = useState<"tasks" | "files" | null>(null);
    const [input, setInput] = useState("");
    const parentRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);

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
      sendMessage,
      stopStream,
      resumeInterrupt,
      retryFromMessage,
      setBranch,
      editMessage,
      setActiveSubAgentId,
      setFiles,
    } = useChatStoreShallow((s) => ({
      stream: s.stream,
      messages: s.messages,
      todos: s.todos,
      files: s.files,
      ui: s.ui,
      isLoading: s.isLoading,
      isThreadLoading: s.isThreadLoading,
      interrupt: s.interrupt,
      error: s.error,
      subagentMessagesMap: s.subagentMessagesMap,
      activeSubAgentId: s.activeSubAgentId,
      getMessagesMetadata: s.getMessagesMetadata,
      getMessageBranchInfo: s.getMessageBranchInfo,
      sendMessage: s.sendMessage,
      stopStream: s.stopStream,
      resumeInterrupt: s.resumeInterrupt,
      retryFromMessage: s.retryFromMessage,
      setBranch: s.setBranch,
      editMessage: s.editMessage,
      setActiveSubAgentId: s.setActiveSubAgentId,
      setFiles: s.setFiles,
    }));

    const { state: inspectorState, dispatch: inspectorDispatch } = useInspector();

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
      [input, isLoading, sendMessage, submitDisabled],
    );

    const throttledMessages = useThrottledValue(messages, isLoading ? 100 : 0);

    const processedMessages = useProcessedMessages(
      throttledMessages,
      subagentMessagesMap,
      interrupt,
    );

    const virtualizer = useVirtualizer({
      count: processedMessages.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 120,
      overscan: 5,
    });

    // Track scroll position with ref (not state) to avoid render-frame gaps
    useEffect(() => {
      const el = parentRef.current;
      if (!el) return;
      const handleScroll = () => {
        const threshold = 50;
        isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      };
      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    // Auto-scroll to bottom when content changes and user is at bottom
    useEffect(() => {
      if (isAtBottomRef.current && processedMessages.length > 0) {
        requestAnimationFrame(() => {
          if (parentRef.current) {
            parentRef.current.scrollTop = parentRef.current.scrollHeight;
          }
        });
      }
    }, [processedMessages]);

    const allSubAgents = useMemo(() => {
      return processedMessages.flatMap((m) => m.subAgents);
    }, [processedMessages]);

    const actionRequestsMap: Map<string, ActionRequest> | null = useMemo(() => {
      const value = interrupt?.value as ToolApprovalInterruptData | undefined;
      const actionRequests = value?.action_requests;
      if (!actionRequests || !Array.isArray(actionRequests))
        return new Map<string, ActionRequest>();
      return new Map(actionRequests.map((ar: ActionRequest) => [ar.name, ar]));
    }, [interrupt]);

    const reviewConfigsMap: Map<string, ReviewConfig> | null = useMemo(() => {
      const value = interrupt?.value as ToolApprovalInterruptData | undefined;
      const reviewConfigs = value?.review_configs;
      if (!reviewConfigs || !Array.isArray(reviewConfigs)) return new Map<string, ReviewConfig>();
      return new Map(reviewConfigs.map((rc: ReviewConfig) => [rc.action_name, rc]));
    }, [interrupt]);

    const uiByMessageId = useMemo(() => {
      if (!ui) return new Map<string, UiComponent[]>();
      if (!Array.isArray(ui)) return new Map<string, UiComponent[]>();
      const map = new Map<string, UiComponent[]>();
      for (const u of ui as UiComponent[]) {
        const messageId = u.metadata?.message_id;
        if (messageId) {
          const existing = map.get(messageId) || [];
          existing.push(u);
          map.set(messageId, existing);
        }
      }
      return map;
    }, [ui]);

    const lastActiveSubAgentIdRef = useRef<string | null>(null);
    const rightPanelRef = useRef<ImperativePanelHandle>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
      if (sidePanelView !== null) {
        setTimeout(() => rightPanelRef.current?.expand(), 0);
      } else {
        rightPanelRef.current?.collapse();
      }
    }, [sidePanelView]);

    if (activeSubAgentId) {
      lastActiveSubAgentIdRef.current = activeSubAgentId;
    }

    const lastActiveSubAgentId = activeSubAgentId ?? lastActiveSubAgentIdRef.current;

    // Close Inspector when SubAgent panel opens (mutual exclusion)
    const handleSetActiveSubAgentId = useCallback(
      (id: string | null) => {
        setActiveSubAgentId(id);
        if (id !== null) {
          setSidePanelView("agent");
          setAgentTabBadge(false);
        }
      },
      [setActiveSubAgentId, setSidePanelView, setAgentTabBadge],
    );

    // --- SubAgent auto-activation coordinator ---
    const prevSubAgentIdRef = useRef(activeSubAgentId);
    useEffect(() => {
      const wasActive = !!prevSubAgentIdRef.current;
      const isActive = !!activeSubAgentId;
      if (!wasActive && isActive) {
        if (sidePanelView === null) {
          setSidePanelView("agent");
        } else if (sidePanelView === "inspector") {
          setAgentTabBadge(true);
        }
      }
      prevSubAgentIdRef.current = activeSubAgentId;
    }, [activeSubAgentId, sidePanelView, setSidePanelView, setAgentTabBadge]);

    // --- Inspector data arrival coordinator ---
    const prevInspectorOpenRef = useRef(inspectorState.isOpen);
    useEffect(() => {
      if (inspectorState.isOpen && !prevInspectorOpenRef.current) {
        if (sidePanelView === null) {
          setSidePanelView("inspector");
        } else if (sidePanelView === "agent") {
          setInspectorTabBadge(true);
        }
      }
      prevInspectorOpenRef.current = inspectorState.isOpen;
    }, [inspectorState.isOpen, sidePanelView, setSidePanelView, setInspectorTabBadge]);

    // --- Side panel handlers ---
    const handleSetSidePanelView = useCallback(
      (view: SidePanelView) => {
        setSidePanelView(view);
        if (view === "agent") setAgentTabBadge(false);
        if (view === "inspector") setInspectorTabBadge(false);
      },
      [setSidePanelView, setAgentTabBadge, setInspectorTabBadge],
    );

    // Wrap the onCloseSidePanel to also dispatch CLOSE_PANEL to inspector reducer
    const handleCloseSidePanel = useCallback(() => {
      onCloseSidePanel();
      inspectorDispatch({ type: "CLOSE_PANEL" });
    }, [onCloseSidePanel, inspectorDispatch]);

    const tCommon = useTranslations("common");

    const sidePanelVisible = sidePanelView !== null;

    return (
      <div className="relative flex flex-1 overflow-hidden bg-background">
        <ResizablePanelGroup
          direction="horizontal"
          id="chat-interface-group"
        >
          <ResizablePanel
            defaultSize={sidePanelVisible ? 60 : 100}
            className={!isDragging ? "transition-all duration-300 ease-in-out" : ""}
          >
            <div className="relative flex h-full flex-col overflow-hidden w-full">
              <div
                className="scrollbar-pretty flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
                ref={parentRef}
                style={{ touchAction: "pan-y" }}
              >
                {isThreadLoading && processedMessages.length === 0 ? (
                  <div className="mx-auto w-full max-w-[900px] px-3 pb-4 pt-2 md:px-4">
                    {loadingSkeletonElements}
                  </div>
                ) : (
                  <div
                    style={{
                      height: virtualizer.getTotalSize(),
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const index = virtualRow.index;
                      const data = processedMessages[index];
                      const messageUi = data.message.id
                        ? uiByMessageId.get(data.message.id)
                        : undefined;
                      const isLastMessage = index === processedMessages.length - 1;
                      const isStreaming = isLastMessage && isLoading;

                      const branchInfo = getMessageBranchInfo?.(data.message, index);
                      const branchOptions = branchInfo?.branchOptions || [];
                      const currentBranchIndex = branchInfo?.currentBranchIndex ?? 0;
                      const canRetry = branchInfo?.canRetry;

                      return (
                        <div
                          key={data.message.id}
                          data-index={index}
                          ref={virtualizer.measureElement}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <div className="mx-auto w-full max-w-[900px] px-3 md:px-4">
                            <div className="flex flex-col">
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
                                  setActiveSubAgentId={handleSetActiveSubAgentId}
                                />
                              </ErrorBoundary>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {error ? (
                  <div className="mx-auto w-full max-w-[900px] px-3 md:px-4">
                    <Alert
                      variant="destructive"
                      className="mb-4"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{tCommon("error")}</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                ) : null}
              </div>

              {/* Input Container */}
              <div className="flex-shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-4 pt-8 sm:px-4">
                <div className="mx-auto mb-2 flex max-w-[800px] justify-center">
                  <AgentThinkingIndicator isActive={isLoading} />
                </div>
                <div className="focus-within:border-primary/30 mx-auto flex max-w-[800px] flex-col overflow-hidden rounded-[26px] border border-border bg-background shadow-2xl shadow-primary/5 transition-[border-color,box-shadow] duration-200 focus-within:shadow-primary/10">
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
            onDragging={setIsDragging}
            className={`transition-opacity duration-300 ${!sidePanelVisible ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}`}
          />
          <ResizablePanel
            ref={rightPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={sidePanelVisible ? 40 : 0}
            minSize={30}
            maxSize={60}
            className={`${!isDragging ? "transition-all duration-300 ease-in-out" : ""} ${sidePanelVisible ? "opacity-100" : "opacity-0"}`}
            onCollapse={() => {
              if (sidePanelVisible) handleCloseSidePanel();
            }}
          >
            <div className="flex h-full w-full flex-col overflow-hidden bg-background">
              <SidePanelHeader
                activeView={sidePanelView ?? "inspector"}
                onSetView={handleSetSidePanelView}
                onClose={handleCloseSidePanel}
                agentBadge={agentTabBadge}
                inspectorBadge={inspectorTabBadge}
              />
              {sidePanelView === "agent" ? (
                <SubAgentPanel
                  subAgentId={activeSubAgentId || lastActiveSubAgentId}
                  subAgents={allSubAgents}
                  subagentMessagesMap={subagentMessagesMap}
                  onClose={handleCloseSidePanel}
                />
              ) : sidePanelView === "inspector" ? (
                <ErrorBoundary>
                  <InspectorPanel />
                </ErrorBoundary>
              ) : null}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

ChatInterfaceInner.displayName = "ChatInterfaceInner";

// Outer component that provides Inspector context
export const ChatInterface = React.memo<ChatInterfaceProps>(({ assistant }) => {
  const chatSendMessage = useChatStoreShallow((s) => s.sendMessage);
  const setActiveSubAgentId = useChatStoreShallow((s) => s.setActiveSubAgentId);

  // Side panel state lifted here so InspectorProvider callbacks can reference it
  const [sidePanelView, setSidePanelView] = useState<SidePanelView | null>(null);
  const [agentTabBadge, setAgentTabBadge] = useState(false);
  const [inspectorTabBadge, setInspectorTabBadge] = useState(false);

  const handleInspectorSendMessage = useCallback(
    (message: string) => {
      chatSendMessage(message);
    },
    [chatSendMessage],
  );

  const handleRequestShowInspector = useCallback(() => {
    setSidePanelView("inspector");
    setInspectorTabBadge(false);
  }, []);

  const handleToggleInspector = useCallback(() => {
    setSidePanelView((prev) => {
      if (prev === "inspector") {
        return null;
      }
      setInspectorTabBadge(false);
      return "inspector";
    });
  }, []);

  const handleCloseSidePanel = useCallback(() => {
    setSidePanelView(null);
    setActiveSubAgentId(null);
  }, [setActiveSubAgentId]);

  return (
    <InspectorProvider
      onSendMessage={handleInspectorSendMessage}
      onRequestShow={handleRequestShowInspector}
      onToggleInspector={handleToggleInspector}
      onClosePanel={handleCloseSidePanel}
    >
      <ChatInterfaceInner
        assistant={assistant}
        sidePanelView={sidePanelView}
        setSidePanelView={setSidePanelView}
        agentTabBadge={agentTabBadge}
        setAgentTabBadge={setAgentTabBadge}
        inspectorTabBadge={inspectorTabBadge}
        setInspectorTabBadge={setInspectorTabBadge}
        onCloseSidePanel={handleCloseSidePanel}
      />
    </InspectorProvider>
  );
});

ChatInterface.displayName = "ChatInterface";
