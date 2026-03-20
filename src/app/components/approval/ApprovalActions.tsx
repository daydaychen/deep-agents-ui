"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

    // Move useMemo before any early returns to satisfy React Hooks rules
    const allowedDecisionsSet = React.useMemo(() => new Set(allowedDecisions), [allowedDecisions]);

    if (isEditing) {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelEdit}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px]"
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={onEdit}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px] bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
          >
            {isLoading ? (
              <div className="mr-2 animate-spin">
                <Loader2 className="h-4 w-4" />
              </div>
            ) : (
              <Check size={14} />
            )}
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
            className="min-h-[44px] min-w-[44px]"
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onRejectConfirm}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px]"
          >
            {isLoading ? t("rejecting") : t("confirmReject")}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {allowedDecisionsSet.has("reject") && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isLoading}
            className="min-h-[18px] min-w-[44px] text-destructive hover:bg-destructive/10"
          >
            <X size={14} />
            {t("reject")}
          </Button>
        )}
        {allowedDecisionsSet.has("edit") && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStartEdit}
            disabled={isLoading}
            className="min-h-[18px] min-w-[44px]"
          >
            <Pencil size={14} />
            {t("edit")}
          </Button>
        )}
        {allowedDecisionsSet.has("approve") && (
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isLoading}
            className={cn(
              "min-h-[18px] min-w-[44px] bg-green-600 text-white hover:bg-green-700",
              "dark:bg-green-600 dark:hover:bg-green-700",
            )}
          >
            <Check size={14} />
            {isLoading ? t("approving") : t("approve")}
          </Button>
        )}
      </div>
    );
  },
);

ApprovalActions.displayName = "ApprovalActions";
