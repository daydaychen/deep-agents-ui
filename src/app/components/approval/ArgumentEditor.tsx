"use client";

import { Textarea } from "@/components/ui/textarea";
import React from "react";

interface ArgumentEditorProps {
  args: Record<string, unknown>;
  editedArgs: Record<string, unknown>;
  onUpdate: (key: string, value: string) => void;
  isLoading?: boolean;
}

export const ArgumentEditor = React.memo<ArgumentEditorProps>(
  ({ args, editedArgs, onUpdate, isLoading }) => {
    return (
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Edit Arguments
        </span>
        <div className="mt-2 space-y-3">
          {Object.entries(args).map(([key, value]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {key}
              </label>
              <Textarea
                value={
                  editedArgs[key] !== undefined
                    ? typeof editedArgs[key] === "string"
                      ? (editedArgs[key] as string)
                      : JSON.stringify(editedArgs[key], null, 2)
                    : typeof value === "string"
                    ? value
                    : JSON.stringify(value, null, 2)
                }
                onChange={(e) => onUpdate(key, e.target.value)}
                className="font-mono text-xs"
                rows={typeof value === "string" && value.length < 100 ? 2 : 4}
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

ArgumentEditor.displayName = "ArgumentEditor";
