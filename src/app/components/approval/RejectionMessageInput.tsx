"use client";

import { Textarea } from "@/components/ui/textarea";
import React from "react";

interface RejectionMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export const RejectionMessageInput = React.memo<RejectionMessageInputProps>(
  ({ value, onChange, isLoading }) => {
    return (
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-foreground">
          Rejection Message (optional)
        </label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Explain why you're rejecting this action..."
          className="text-sm"
          rows={2}
          disabled={isLoading}
        />
      </div>
    );
  }
);

RejectionMessageInput.displayName = "RejectionMessageInput";
