"use client";

import { Textarea } from "@/components/ui/textarea";
import React from "react";
import React from "react";
import { useTranslations } from "next-intl";
interface RejectionMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export const RejectionMessageInput = React.memo<RejectionMessageInputProps>(
  export const RejectionMessageInput = React.memo<RejectionMessageInputProps>(
  ({ value, onChange, isLoading }) => {
    const t = useTranslations("approval");
    return (
    return (
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-foreground">
          {t("rejectionMessage")}
        </label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("rejectionPlaceholder")}
          Rejection Message (optional)
        </label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Explain why you're rejecting this action…"
          className="text-sm"
          rows={2}
          disabled={isLoading}
        />
      </div>
    );
  }
);

RejectionMessageInput.displayName = "RejectionMessageInput";
