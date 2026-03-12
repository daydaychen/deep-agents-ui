"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Message } from "@langchain/langgraph-sdk";
import { MessageContent } from "./MessageContent";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { X, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SubAgent } from "@/app/types/types";

interface SubAgentPanelProps {
  subAgentId: string | null;
  subAgents: SubAgent[];
  subagentMessagesMap: Map<string, Message[]>;
  onClose: () => void;
}

const EMPTY_MESSAGES: Message[] = [];

export const SubAgentPanel = React.memo<SubAgentPanelProps>(({
  subAgentId,
  subAgents,
  subagentMessagesMap,
  onClose,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  const subAgent = useMemo(
    () => subAgents.find((s) => s.id === subAgentId),
    [subAgents, subAgentId]
  );

  // Robust message lookup with memoization to stabilize reference
  const rawMessages = useMemo(() => {
    if (!subAgentId) return EMPTY_MESSAGES;
    const fromMap = subagentMessagesMap.get(subAgentId);
    if (fromMap) return fromMap;
    if (subAgent?.agentName) {
      const fromAgentName = subagentMessagesMap.get(subAgent.agentName);
      if (fromAgentName) return fromAgentName;
    }
    return EMPTY_MESSAGES;
  }, [subAgentId, subagentMessagesMap, subAgent?.agentName]);

  // Use the hook to process subagent messages and extract tool calls
  const processedMessages = useProcessedMessages(rawMessages, undefined);

  const status = subAgent?.status || "pending";
  const name = subAgent?.agentName || subAgent?.subAgentName || "Subagent";

  // Auto-scroll to bottom when new messages or tool calls arrive
  useEffect(() => {
    if (processedMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [processedMessages.length]);

  if (!subAgentId) return null;

  return (
    <div
      role="complementary"
      aria-label={`${name} details`}
      className="flex flex-col h-full bg-background min-w-0 w-full overflow-hidden"
    >
      {/* Panel Header - Fixed Height */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 shrink-0 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-all",
            status === "active" ? "bg-primary/5 border-primary/20 text-primary animate-pulse" : "bg-muted/50 border-border text-muted-foreground"
          )}>
            {status === "active" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/80 leading-none mb-1.5 truncate">
              {name}
            </h3>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                status === "active" ? "bg-blue-500 animate-pulse" :
                  status === "completed" ? "bg-green-500" :
                    status === "error" ? "bg-destructive" : "bg-muted-foreground/30"
              )} />
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 transition-colors">
                {status === "active" ? "Processing…" : status}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full shrink-0 ml-2 hover:bg-muted"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content Stream - Scrollable Area */}
      <div className="flex-1 min-h-0 relative w-full overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-8 p-4 md:p-6 pb-20 w-full min-w-0 overflow-hidden">
            {processedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 px-4">
                <Terminal size={32} className="mb-4 text-muted-foreground/30" />
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Waiting for activity...
                </p>
              </div>
            ) : (
              processedMessages.map((data, idx) => {
                const isUser = data.message.type === "human";
                const messageContent = extractStringFromMessageContent(data.message);
                const hasContent = messageContent && messageContent.trim() !== "";
                const hasToolCalls = data.toolCalls.length > 0;

                return (
                  <div key={data.message.id || `proc-msg-${idx}`} className="flex flex-col gap-3 w-full min-w-0 overflow-hidden">
                    {/* Message Header Label */}
                    <div className="flex items-center gap-2 px-1 shrink-0">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isUser ? "bg-primary/40" : "bg-blue-500/40"
                      )} />
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        {isUser ? "Instruction" : "Action Trace"}
                      </div>
                    </div>

                    <div className="flex flex-1 min-w-0 flex-col gap-4 pl-3.5 pr-1.5 border-l border-border/40 ml-1 overflow-hidden transition-colors hover:border-border/80">
                      {/* Text Content */}
                      {hasContent && (
                        <div className="min-w-0 overflow-hidden">
                          <MessageContent
                            content={messageContent}
                            isUser={isUser}
                          />
                        </div>
                      )}

                      {/* Tool Calls */}
                      {hasToolCalls && (
                        <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
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
                  </div>
                );
              })
            )}
            <div ref={bottomRef} className="h-px w-full shrink-0" />
          </div>
        </ScrollArea>
      </div>

      {/* Panel Footer - Fixed Height */}
      <div className="border-t border-border/30 p-2.5 bg-muted/5 shrink-0">
        <div className="flex items-center justify-center gap-2 opacity-30">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/40 to-transparent" />
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            Internal Agent Execution Trace
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/40 to-transparent" />
        </div>
      </div>
    </div>
  );
});

SubAgentPanel.displayName = "SubAgentPanel";
