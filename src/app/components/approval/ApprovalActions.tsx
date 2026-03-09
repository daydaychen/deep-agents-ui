"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Pencil, X } from "lucide-react";
import React from "react";
import { useTranslations } from "next-intl";

interface ApprovalActionsProps {
  isEditing: boolean;
  showRejectionInput: boolean;
  allowedDecisions: string[];
  onApprove: () => void;
  onReject: () => void;
  onRejectConfirm: () => void;
  onEdit: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCancelRejection: () => void;
  isLoading?: boolean;
}

export const ApprovalActions = React.memo<ApprovalActionsProps>(
  ({
    isEditing,
    showRejectionInput,
    allowedDecisions,
    onApprove,
    onReject,
    onRejectConfirm,
    onEdit,
    onStartEdit,
    onCancelEdit,
    onCancelRejection,
    isLoading,
  }) => {
    const t = useTranslations("approval");
  ({
    isEditing,
    showRejectionInput,
    allowedDecisions,
    onApprove,
    onReject,
    onRejectConfirm,
    onEdit,
    onStartEdit,
    onCancelEdit,
    onCancelRejection,
    isLoading,
  }) => {
    if (isEditing) {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelEdit}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={onEdit}
            disabled={isLoading}
            className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
          >
            <Check size={14} />
            {isLoading ? t("saving") : t("saveAndApprove")}
          </Button>
        </div>
      );
    }

    if (showRejectionInput) {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelRejection}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onRejectConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("rejecting") : t("confirmReject")}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {allowedDecisions.includes("reject") && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isLoading}
            className="text-destructive hover:bg-destructive/10"
          >
            <X size={14} />
            {t("reject")}
          </Button>
        )}
        {allowedDecisions.includes("edit") && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStartEdit}
            disabled={isLoading}
          >
            <Pencil size={14} />
            {t("edit")}
          </Button>
        )}
        {allowedDecisions.includes("approve") && (
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isLoading}
            className={cn(
              "bg-green-600 text-white hover:bg-green-700",
              "dark:bg-green-600 dark:hover:bg-green-700"
            )}
          >
            <Check size={14} />
            {isLoading ? t("approving") : t("approve")}
          </Button>
        )}
      </div>
    );
  }
);

ApprovalActions.displayName = "ApprovalActions";
