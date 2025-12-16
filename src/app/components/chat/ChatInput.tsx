"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import React, { FormEvent, useCallback } from "react";

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
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (submitDisabled) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      },
      [onSubmit, submitDisabled]
    );

    return (
      <form
        onSubmit={onSubmit}
        className="flex flex-col"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Running..." : "Write your message..."}
          className="font-inherit field-sizing-content flex-1 resize-none border-0 bg-transparent px-[18px] pb-[13px] pt-[14px] text-sm leading-7 text-primary outline-none placeholder:text-tertiary"
          rows={1}
        />
        <div className="flex justify-between gap-2 p-3">
          <div className="flex justify-end gap-2">
            <Button
              type={isLoading ? "button" : "submit"}
              variant={isLoading ? "destructive" : "default"}
              onClick={isLoading ? onStop : onSubmit}
              disabled={!isLoading && (submitDisabled || !input.trim())}
            >
              {isLoading ? (
                <>
                  <Square size={14} />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <ArrowUp size={18} />
                  <span>Send</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    );
  }
);

ChatInput.displayName = "ChatInput";
