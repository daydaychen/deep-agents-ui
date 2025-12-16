"use client";

import { ArgumentEditor } from "@/app/components/approval/ArgumentEditor";
import type { ActionRequest } from "@/app/types/types";
import React from "react";

interface ToolInfoCardProps {
  actionRequest: ActionRequest;
  isEditing: boolean;
  editedArgs: Record<string, unknown>;
  onUpdateArg: (key: string, value: string) => void;
  isLoading?: boolean;
}

export const ToolInfoCard = React.memo<ToolInfoCardProps>(
  ({ actionRequest, isEditing, editedArgs, onUpdateArg, isLoading }) => {
    return (
      <div className="mb-4 rounded-sm border border-border bg-background p-3">
        <div className="mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tool
          </span>
          <p className="mt-1 font-mono text-sm font-medium text-foreground">
            {actionRequest.name}
          </p>
        </div>

        {isEditing ? (
          <ArgumentEditor
            args={actionRequest.args}
            editedArgs={editedArgs}
            onUpdate={onUpdateArg}
            isLoading={isLoading}
          />
        ) : (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Arguments
            </span>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-sm border border-border bg-muted/40 p-2 font-mono text-xs text-foreground">
              {JSON.stringify(actionRequest.args, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }
);

ToolInfoCard.displayName = "ToolInfoCard";
