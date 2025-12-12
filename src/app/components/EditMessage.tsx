"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Save, X } from "lucide-react";
import type { Message } from "@langchain/langgraph-sdk";

interface EditMessageProps {
  message: Message;
  onEdit: (message: Message) => void;
  className?: string;
}

export const EditMessage = React.memo<EditMessageProps>(
  ({ message, onEdit, className }) => {
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(message.content as string);

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (content.trim() === "") return;

      onEdit({ ...message, content });
      setEditing(false);
    };

    const handleCancel = () => {
      setContent(message.content as string);
      setEditing(false);
    };

    if (!editing) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Edit className="h-3 w-3" />
          Edit
        </Button>
      );
    }

    return (
      <form
        onSubmit={handleSave}
        className={className}
      >
        <div className="flex flex-col gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-7 text-xs"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <Save className="h-3 w-3" />
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 gap-1 px-2 text-xs"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      </form>
    );
  }
);

EditMessage.displayName = "EditMessage";
