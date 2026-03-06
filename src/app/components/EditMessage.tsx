"use client";

import { extractStringFromMessageContent } from "@/app/utils/utils";
import type { UIMessage } from "@/app/types/messages";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, Edit, X } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";

interface EditMessageProps {
  message: UIMessage;
  onEdit: (message: UIMessage) => void;
  className?: string;
  showText?: boolean;
}

export const EditMessage = React.memo<EditMessageProps>(
  ({ message, onEdit, className, showText = true }) => {
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(
      extractStringFromMessageContent(message)
    );
    const isComposingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea based on content
    React.useLayoutEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "inherit";
        const scrollHeight = textarea.scrollHeight;
        if (scrollHeight > 0) {
          textarea.style.height = `${scrollHeight}px`;
        }
      }
    }, [content]);

    const handleSave = useCallback(
      (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault();
        }
        if (content.trim() === "") return;

        onEdit({ ...message, content: content.trim() });
        setEditing(false);
      },
      [content, message, onEdit]
    );

    const handleCancel = useCallback(() => {
      setContent(extractStringFromMessageContent(message));
      setEditing(false);
    }, [message]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
          e.preventDefault();
          handleSave();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleCancel();
        }
      },
      [handleSave, handleCancel]
    );

    if (!editing) {
      const button = (
        <Button
          variant="ghost"
          size={showText ? "sm" : "icon"}
          onClick={() => setEditing(true)}
          className={
            showText 
              ? "group h-7 gap-1 px-2 text-xs text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground"
              : "h-6 w-6 rounded-full text-muted-foreground transition-all duration-200 hover:bg-accent/60 hover:text-foreground"
          }
        >
          <Edit className="h-3 w-3" />
          {showText && (
            <span className="transition-[background-color,color,opacity,transform] duration-200">Edit</span>
          )}
        </Button>
      );

      if (showText) return button;

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
            <span>Edit message</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div className={className}>
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2"
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            className="font-inherit w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-primary outline-none placeholder:text-tertiary"
            style={{
              fieldSizing: "content",
            }}
            placeholder="Edit your message…"
            autoFocus
            rows={1}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 gap-1 px-2 text-xs"
              title="Cancel (Esc)"
            >
              <X className="h-3 w-3" />
              <span>Cancel</span>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim()}
              className="h-7 gap-1 px-2 text-xs"
              title="Save (Enter)"
            >
              <Check className="h-3 w-3" />
              <span>Save</span>
            </Button>
          </div>
        </form>
      </div>
    );
  }
);

EditMessage.displayName = "EditMessage";
