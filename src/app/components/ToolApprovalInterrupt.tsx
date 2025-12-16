"use client";

import { ApprovalActions } from "@/app/components/approval/ApprovalActions";
import { RejectionMessageInput } from "@/app/components/approval/RejectionMessageInput";
import { ToolInfoCard } from "@/app/components/approval/ToolInfoCard";
import { useApprovalState } from "@/app/hooks/approval/useApprovalState";
import type { ActionRequest, ReviewConfig } from "@/app/types/types";
import { AlertCircle } from "lucide-react";

interface ToolApprovalInterruptProps {
  actionRequest: ActionRequest;
  reviewConfig?: ReviewConfig;
  onResume: (value: any) => void;
  isLoading?: boolean;
}

export function ToolApprovalInterrupt({
  actionRequest,
  reviewConfig,
  onResume,
  isLoading,
}: ToolApprovalInterruptProps) {
  const {
    rejectionMessage,
    isEditing,
    editedArgs,
    showRejectionInput,
    handleApprove,
    handleReject,
    handleRejectConfirm,
    handleEdit,
    startEditing,
    cancelEditing,
    updateEditedArg,
    setRejectionMessage,
    cancelRejection,
  } = useApprovalState(actionRequest, onResume);

  const allowedDecisions = reviewConfig?.allowed_decisions ?? [
    "approve",
    "reject",
    "edit",
  ];

  return (
    <div className="w-full rounded-md border border-border bg-muted/30 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <AlertCircle
          size={16}
          className="text-yellow-600 dark:text-yellow-400"
        />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Approval Required
        </span>
      </div>

      {/* Description */}
      {actionRequest.description && (
        <p className="mb-3 text-sm text-muted-foreground">
          {actionRequest.description}
        </p>
      )}

      {/* Tool Info Card */}
      <ToolInfoCard
        actionRequest={actionRequest}
        isEditing={isEditing}
        editedArgs={editedArgs}
        onUpdateArg={updateEditedArg}
        isLoading={isLoading}
      />

      {/* Rejection Message Input */}
      {showRejectionInput && !isEditing && (
        <RejectionMessageInput
          value={rejectionMessage}
          onChange={setRejectionMessage}
          isLoading={isLoading}
        />
      )}

      {/* Actions */}
      <ApprovalActions
        isEditing={isEditing}
        showRejectionInput={showRejectionInput}
        allowedDecisions={allowedDecisions}
        onApprove={handleApprove}
        onReject={handleReject}
        onRejectConfirm={handleRejectConfirm}
        onEdit={handleEdit}
        onStartEdit={startEditing}
        onCancelEdit={cancelEditing}
        onCancelRejection={cancelRejection}
        isLoading={isLoading}
      />
    </div>
  );
}
