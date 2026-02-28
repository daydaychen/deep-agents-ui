"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, Square, Command } from "lucide-react";
import React, { FormEvent, useCallback, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  submitDisabled: boolean;
  onSubmit: (e?: FormEvent) => void;
  onStop: () => void;
}

export const ChatInput = React.memo<ChatInputProps>(
  ({ input, setInput, isLoading, submitDisabled, onSubmit, onStop }) => {
    const isComposingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (submitDisabled) return;
        if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
          e.preventDefault();
          onSubmit();
        }
      },
      [onSubmit, submitDisabled]
    );

    // Auto-focus textarea on mount
    useEffect(() => {
      textareaRef.current?.focus();
    }, []);

    const hasInput = input.trim().length > 0;

    return (
      <div className="px-2 pb-3">
        <div
          className={cn(
            "relative flex flex-col gap-1 rounded-2xl bg-transparent px-2 transition-all duration-300",
            isFocused ? "bg-muted/5 shadow-inner" : ""
          )}
        >
          <div className="relative flex flex-1 flex-col px-2 pt-1">
            <label htmlFor="chat-input" className="sr-only">
              Message AI assistant
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              placeholder={isLoading ? "AI is processing..." : "Message Deep Agent..."}
              className={cn(
                "font-sans field-sizing-content flex-1 resize-none border-0 bg-transparent py-3 text-[15px] leading-relaxed text-foreground outline-none ring-0 placeholder:text-muted-foreground/40 transition-all",
                "min-h-[44px] max-h-[300px]"
              )}
              rows={1}
            />
          </div>
          
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-4 text-muted-foreground/30">
              <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase">
                <div className="flex items-center gap-0.5 rounded border border-border/50 bg-muted/30 px-1 py-0.5 font-mono text-[8px]">
                  <Command size={8} />
                  <span>Enter</span>
                </div>
                <span>Send</span>
              </div>
              <div className="h-2 w-[1px] bg-border/40" />
              <div className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase">
                <div className="rounded border border-border/50 bg-muted/30 px-1 py-0.5 font-mono text-[8px]">Shift</div>
                <span>+</span>
                <div className="rounded border border-border/50 bg-muted/30 px-1 py-0.5 font-mono text-[8px]">Enter</div>
                <span>NewLine</span>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {isLoading ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onStop}
                  className="h-7 gap-2 rounded-lg border-destructive/10 bg-destructive/5 text-[10px] font-bold text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Square size={10} fill="currentColor" />
                  STOP CORE
                </Button>
              ) : (
                <Button
                  onClick={() => hasInput && onSubmit()}
                  size="icon"
                  disabled={submitDisabled || !hasInput}
                  className={cn(
                    "h-8 w-8 rounded-xl transition-all duration-500",
                    hasInput 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-110 active:scale-90" 
                      : "bg-muted text-muted-foreground/20 opacity-30"
                  )}
                >
                  <ArrowUp size={16} strokeWidth={3} />
                  <span className="sr-only">Send</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
