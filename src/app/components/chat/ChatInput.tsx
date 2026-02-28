"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import React, { FormEvent, useCallback, useRef, useEffect } from "react";
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
      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 p-3 pr-4"
      >
        <div className="relative flex flex-1 flex-col">
          <label htmlFor="chat-input" className="sr-only">
            Message AI assistant
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            placeholder={isLoading ? "AI is thinking..." : "Ask me anything..."}
            className={cn(
              "font-inherit field-sizing-content flex-1 resize-none border-0 bg-transparent px-2 pb-1.5 pt-1 text-sm leading-relaxed text-foreground outline-none ring-0 placeholder:text-muted-foreground/60 transition-all duration-200",
              "min-h-[40px] max-h-[200px]"
            )}
            rows={1}
          />
        </div>
        
        <div className="flex flex-shrink-0 items-center justify-center pb-0.5">
          {isLoading ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={onStop}
              className="h-8 w-8 rounded-full border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <Square size={14} fill="currentColor" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={submitDisabled || !hasInput}
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-300",
                hasInput 
                  ? "bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95" 
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
              <span className="sr-only">Send message</span>
            </Button>
          )}
        </div>
      </form>
    );
  }
);

ChatInput.displayName = "ChatInput";
