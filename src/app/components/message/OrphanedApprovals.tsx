"use client";

import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import type { ActionRequest, ReviewConfig } from "@/app/types/types";
import React from "react";

interface OrphanedApproval {
  actionRequest: ActionRequest;
  reviewConfig?: ReviewConfig;
}

interface OrphanedApprovalsProps {
  orphanedApprovals: OrphanedApproval[];
  onResumeInterrupt: (value: any) => void;
  isLoading?: boolean;
}

export const OrphanedApprovals = React.memo<OrphanedApprovalsProps>(
  ({ orphanedApprovals, onResumeInterrupt, isLoading }) => {
    if (orphanedApprovals.length === 0) return null;

    return (
      <div className="mt-4 flex w-full flex-col gap-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pending Approvals (Subgraph)
        </div>
        {orphanedApprovals.map(({ actionRequest, reviewConfig }, index) => (
          <div key={`orphaned-${actionRequest.name}-${index}`}>
            <ToolApprovalInterrupt
              actionRequest={actionRequest}
              reviewConfig={reviewConfig}
              onResume={onResumeInterrupt}
              isLoading={isLoading}
            />
          </div>
        ))}
      </div>
    );
  }
);

OrphanedApprovals.displayName = "OrphanedApprovals";
