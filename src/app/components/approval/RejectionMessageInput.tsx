"use client";

import { useTranslations } from "next-intl";
import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface RejectionMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export const RejectionMessageInput = React.memo<RejectionMessageInputProps>(
  ({ value, onChange, isLoading }) => {
    const t = useTranslations("approval");
    return (
      <div className="mb-4">
        <label
          htmlFor="rejection-message"
          className="mb-2 block text-xs font-medium text-foreground"
        >
          {t("rejectionMessage")}
        </label>
        <Textarea
          id="rejection-message"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("rejectionPlaceholder")}
          className="text-sm"
          rows={2}
          disabled={isLoading}
        />
      </div>
    );
  },
);

RejectionMessageInput.displayName = "RejectionMessageInput";
