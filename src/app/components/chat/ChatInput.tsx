"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, Command, Square } from "lucide-react";
import React, { FormEvent, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useChatState } from "@/providers/chat-context";
import { useTranslations } from "next-intl";

import { DockToolbar } from "./DockToolbar";

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
    const t = useTranslations("chat");
    const isComposingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { threadId } = useChatState();

    // Auto-resize textarea based on content
    React.useLayoutEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const scrollHeight = textarea.scrollHeight;
        textarea.style.cssText =
          scrollHeight > 0 ? `height: ${scrollHeight}px;` : "height: inherit;";
      }
    }, [input]);

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

    // Auto-focus textarea on mount or when switching threads
    useEffect(() => {
      textareaRef.current?.focus();
    }, [threadId]);

    const hasInput = input.trim().length > 0;

    const handleSubmitClick = useCallback(() => {
      if (hasInput) {
        onSubmit();
      }
    }, [hasInput, onSubmit]);

    return (
      <div className="px-2 pb-3">
        <div className="relative flex flex-col gap-0.5 px-1">
          <div className="relative flex flex-1 flex-col px-2 pt-0.5">
            <label
              htmlFor="chat-input"
              className="sr-only"
            >
              {t("messageLabel")}
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
              placeholder={
                isLoading
                  ? t("inputPlaceholderLoading")
                  : t("inputPlaceholderDefault")
              }
              className={cn(
                "flex-1 resize-none border-0 bg-transparent py-2.5 font-sans text-[15px] leading-relaxed text-foreground outline-none ring-0 transition-[opacity,color,background-color] placeholder:text-muted-foreground/40",
                "max-h-[300px] min-h-[40px] overflow-y-auto"
              )}
              style={{
                fieldSizing: "content",
              }}
              rows={1}
            />
          </div>

          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-3">
              <DockToolbar />

              <div className="h-3 w-[1px] bg-border/20" />

              <div className="flex items-center gap-4 text-muted-foreground/20">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex scale-90 items-center gap-0.5 rounded border border-border/30 bg-muted/20 px-1 py-0.5 font-mono text-2xs">
                    <Command size={8} />
                    <span>Enter</span>
                  </div>
                  <span>{t("sendShortcut")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {isLoading ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onStop}
                  disabled={!isLoading}
                  className="h-7 cursor-pointer gap-2 rounded-lg border-destructive/10 bg-destructive/5 text-2xs font-bold text-destructive transition-[background-color,color,opacity,transform] hover:bg-destructive/10"
                >
                  <Square
                    size={10}
                    fill="currentColor"
                  />
                  {t("stopCore")}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitClick}
                  size="icon-sm"
                  disabled={submitDisabled || !hasInput}
                  className={cn(
                    "cursor-pointer rounded-xl transition-[background-color,border-color,color,box-shadow,filter,opacity] duration-200 will-change-[box-shadow,filter]",
                    hasInput
                      ? "text-primary-foreground bg-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:brightness-110 active:brightness-90"
                      : "bg-muted text-muted-foreground/20 opacity-30"
                  )}
                >
                  <ArrowUp
                    size={16}
                    strokeWidth={3}
                  />
                  <span className="sr-only">{t("send")}</span>
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
