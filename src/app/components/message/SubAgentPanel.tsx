"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "@langchain/langgraph-sdk";
import { MessageContent } from "./MessageContent";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { useProcessedMessages } from "@/app/hooks/chat/useProcessedMessages";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { X, Bot, Loader2, CheckCircle2, AlertCircle, Terminal } from "lucide-react";
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

export const SubAgentPanel: React.FC<SubAgentPanelProps> = ({
  subAgentId,
  subAgents,
  subagentMessagesMap,
  onClose,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  const subAgent = subAgents.find((s) => s.id === subAgentId);
  
  // Robust message lookup
  const rawMessages = (subAgentId ? subagentMessagesMap.get(subAgentId) : []) || 
                      (subAgent?.agentName ? subagentMessagesMap.get(subAgent.agentName) : []) || 
                      [];
  
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
      className="flex flex-col h-full border-l border-border bg-background shadow-2xl min-w-0 w-full overflow-hidden"
    >
      {/* Panel Header - Fixed Height */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20 shrink-0 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm",
            status === "active" ? "bg-blue-50 border-blue-200 text-blue-600 animate-pulse" : "bg-accent/50 border-accent text-accent-foreground"
          )}>
            {status === "active" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground leading-none mb-1 truncate">{name}</h3>
            <div className="flex items-center gap-1.5">
              {status === "completed" && <CheckCircle2 size={10} className="text-green-600 shrink-0" />}
              {status === "error" && <AlertCircle size={10} className="text-destructive shrink-0" />}
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 truncate block">
                {status === "active" ? "Processing…" : status}
              </span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-8 w-8 rounded-full shrink-0 ml-2"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Stream - Scrollable Area */}
      <div className="flex-1 min-h-0 relative w-full overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-8 p-4 md:p-6 pb-20 w-full min-w-0 overflow-hidden">
            {processedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground/40 px-4">
                <Terminal size={40} className="mb-4 opacity-20" />
                <p className="text-sm font-medium italic">Waiting for internal activity...</p>
              </div>
            ) : (
              processedMessages.map((data, idx) => {
                const isUser = data.message.type === "human";
                const messageContent = extractStringFromMessageContent(data.message);
                const hasContent = messageContent && messageContent.trim() !== "";
                const hasToolCalls = data.toolCalls.length > 0;

                return (
                  <div key={data.message.id || `proc-msg-${idx}`} className="flex flex-col gap-4 w-full min-w-0 overflow-hidden">
                    {/* Message Header Label */}
                    <div className="flex items-center gap-2 px-1 shrink-0">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isUser ? "bg-primary/40" : "bg-blue-500/40"
                      )} />
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        {isUser ? "Request" : "Assistant"}
                      </div>
                    </div>

                    <div className="flex flex-1 min-w-0 flex-col gap-4 pl-3 pr-1.5 border-l-2 border-muted/30 ml-0.5 overflow-hidden">
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
      <div className="border-t border-border p-3 bg-muted/5 shrink-0">
        <p className="text-[10px] text-center text-muted-foreground/40 font-bold uppercase tracking-[0.2em] truncate">
          Internal Trace
        </p>
      </div>
    </div>
  );
};
