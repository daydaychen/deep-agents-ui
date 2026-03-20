"use client";

import { useTranslations } from "next-intl";
import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface ArgumentEditorProps {
  args: Record<string, unknown>;
  editedArgs: Record<string, unknown>;
  onUpdate: (key: string, value: string) => void;
  isLoading?: boolean;
}

export const ArgumentEditor = React.memo<ArgumentEditorProps>(
  ({ args, editedArgs, onUpdate, isLoading }) => {
    const t = useTranslations("approval");
    return (
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("editArguments")}
        </span>
        <div className="mt-2 space-y-3">
          {Object.entries(args).map(([key, value]) => (
            <div key={key}>
              <label
                htmlFor={`arg-${key}`}
                className="mb-1 block text-xs font-medium text-foreground"
              >
                {key}
              </label>
              <Textarea
                id={`arg-${key}`}
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
  },
);

ArgumentEditor.displayName = "ArgumentEditor";
