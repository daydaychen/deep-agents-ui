"use client";

import { ArrowUp, Command, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { FormEvent, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/providers/chat-store-provider";
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

    const threadId = useChatStore((s) => s.threadId);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (submitDisabled) return;
        if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
          e.preventDefault();
          onSubmit();
        }
      },
      [onSubmit, submitDisabled],
    );

    // Auto-resize textarea based on content
    // biome-ignore lint/correctness/useExhaustiveDependencies: <Only depends on input value>
    React.useLayoutEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = scrollHeight > 0 ? `${scrollHeight}px` : "auto";

        if (scrollHeight > 300) {
          textarea.style.overflowY = "auto";
        } else {
          textarea.style.overflowY = "hidden";
        }
      }
    }, [input]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <Auto-focus textarea on mount or when switching threads>
    useEffect(() => {
      textareaRef.current?.focus();
    }, [threadId]);

    const hasInput = input.trim().length > 0;

    const handleSubmitClick = useCallback(() => {
      if (hasInput) {
        onSubmit();
      }
    }, [hasInput, onSubmit]);

    const handleDockAction = useCallback(() => {
      // Use setTimeout to ensure focus happens after DropdownMenu finishes its closing focus management
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }, []);

    return (
      <div className="px-1.5 pb-1 w-full h-auto">
        <div className="relative flex flex-col gap-0 px-0.5 w-full h-auto">
          <div className="relative flex flex-col px-1.5 pt-0 w-full h-auto">
            <label
              htmlFor="chat-input"
              className="sr-only"
            >
              {t("messageLabel")}
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              placeholder={isLoading ? t("inputPlaceholderLoading") : t("inputPlaceholderDefault")}
              className={cn(
                "w-full resize-none border-0 bg-transparent py-1.5 font-sans text-[15px] leading-relaxed text-foreground outline-none ring-0 placeholder:text-muted-foreground/40",
                "max-h-[300px]",
              )}
            />
          </div>

          <div className="flex items-center justify-between px-1.5 pb-1">
            <div className="flex items-center gap-1">
              <DockToolbar onAction={handleDockAction} />
            </div>

            <div className="flex flex-shrink-0 items-center gap-2.5 pr-1">
              <div className="flex items-center gap-1 text-muted-foreground/30 transition-opacity hover:opacity-100">
                <div className="flex scale-[0.75] items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-1.5 py-0.5 font-mono text-3xs font-bold ring-1 ring-border/5">
                  <Command
                    size={10}
                    strokeWidth={2.5}
                  />
                  <span className="leading-none">ENTER</span>
                </div>
              </div>

              {isLoading ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onStop}
                  disabled={!isLoading}
                  className="h-8 min-w-[70px] cursor-pointer gap-2 rounded-full border border-destructive/20 bg-destructive/5 text-[11px] font-bold text-destructive transition-all hover:bg-destructive/10 active:scale-95"
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
                  size="icon"
                  disabled={submitDisabled || !hasInput}
                  className={cn(
                    "h-9 w-9 cursor-pointer rounded-full transition-all duration-300 active:scale-90",
                    hasInput
                      ? "text-primary-foreground bg-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 hover:brightness-110"
                      : "bg-muted text-muted-foreground/20 opacity-40",
                  )}
                >
                  <ArrowUp
                    size={18}
                    strokeWidth={2.5}
                  />
                  <span className="sr-only">{t("send")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ChatInput.displayName = "ChatInput";
