"use client";

import { Button } from "@/components/ui/button";
import type { Message } from "@langchain/langgraph-sdk";
import { Check, Edit, X } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { extractStringFromMessageContent } from "@/app/utils/utils";

interface EditMessageProps {
  message: Message;
  onEdit: (message: Message) => void;
  className?: string;
}

export const EditMessage = React.memo<EditMessageProps>(
  ({ message, onEdit, className }) => {
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(
      extractStringFromMessageContent(message)
    );
    const isComposingRef = useRef(false);

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
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          className="group h-7 gap-1 px-2 text-xs text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground"
          title="Edit message"
        >
          <Edit className="h-3 w-3 transition-transform duration-200 group-hover:scale-110" />
          <span className="transition-all duration-200">Edit</span>
        </Button>
      );
    }

    return (
      <div className={className}>
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            className="font-inherit field-sizing-content min-h-[2.5rem] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-primary outline-none placeholder:text-tertiary"
            placeholder="Edit your message..."
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
