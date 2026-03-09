"use client";

import { Textarea } from "@/components/ui/textarea";
import React from "react";
import { useTranslations } from "next-intl";

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
        <label className="mb-2 block text-xs font-medium text-foreground">
          {t("rejectionMessage")}
        </label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("rejectionPlaceholder")}
          className="text-sm"
          rows={2}
          disabled={isLoading}
        />
      </div>
    );
  }
);

RejectionMessageInput.displayName = "RejectionMessageInput";
