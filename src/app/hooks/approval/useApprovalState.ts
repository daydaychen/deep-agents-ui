import { useState, useCallback } from "react";
import type { ActionRequest } from "@/app/types/types";

export interface ApprovalState {
  rejectionMessage: string;
  isEditing: boolean;
  editedArgs: Record<string, unknown>;
  showRejectionInput: boolean;
}

export interface ApprovalActions {
  handleApprove: () => void;
  handleReject: () => void;
  handleRejectConfirm: () => void;
  handleEdit: () => void;
  startEditing: () => void;
  cancelEditing: () => void;
  updateEditedArg: (key: string, value: string) => void;
  setRejectionMessage: (message: string) => void;
  cancelRejection: () => void;
}

/**
 * Manage approval/rejection/editing state and actions for tool approval interrupts
 */
export function useApprovalState(
  actionRequest: ActionRequest,
  onResume: (value: any) => void
): ApprovalState & ApprovalActions {
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedArgs, setEditedArgs] = useState<Record<string, unknown>>({});
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  const handleApprove = useCallback(() => {
    onResume({
      decisions: [{ type: "approve" }],
    });
  }, [onResume]);

  const handleReject = useCallback(() => {
    if (showRejectionInput) {
      onResume({
        decisions: [
          {
            type: "reject",
            message: rejectionMessage.trim(),
          },
        ],
      });
    } else {
      setShowRejectionInput(true);
    }
  }, [showRejectionInput, rejectionMessage, onResume]);

  const handleRejectConfirm = useCallback(() => {
    onResume({
      decisions: [
        {
          type: "reject",
          message: rejectionMessage.trim(),
        },
      ],
    });
  }, [rejectionMessage, onResume]);

  const handleEdit = useCallback(() => {
    if (isEditing) {
      onResume({
        decisions: [
          {
            type: "edit",
            edited_action: {
              name: actionRequest.name,
              args: editedArgs,
            },
          },
        ],
      });
      setIsEditing(false);
      setEditedArgs({});
    }
  }, [isEditing, editedArgs, actionRequest.name, onResume]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setEditedArgs(JSON.parse(JSON.stringify(actionRequest.args)));
    setShowRejectionInput(false);
  }, [actionRequest.args]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditedArgs({});
  }, []);

  const updateEditedArg = useCallback((key: string, value: string) => {
    try {
      const parsedValue =
        value.trim().startsWith("{") || value.trim().startsWith("[")
          ? JSON.parse(value)
          : value;
      setEditedArgs((prev) => ({ ...prev, [key]: parsedValue }));
    } catch {
      setEditedArgs((prev) => ({ ...prev, [key]: value }));
    }
  }, []);

  const cancelRejection = useCallback(() => {
    setShowRejectionInput(false);
    setRejectionMessage("");
  }, []);

  return {
    // State
    rejectionMessage,
    isEditing,
    editedArgs,
    showRejectionInput,
    // Actions
    handleApprove,
    handleReject,
    handleRejectConfirm,
    handleEdit,
    startEditing,
    cancelEditing,
    updateEditedArg,
    setRejectionMessage,
    cancelRejection,
  };
}
