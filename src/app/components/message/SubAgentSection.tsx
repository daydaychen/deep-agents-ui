"use client";

import React, { useCallback, useState } from "react";
import { SubAgentDetails } from "@/app/components/message/SubAgentDetails";
import { SubAgentIndicator } from "@/app/components/SubAgentIndicator";
import type { ActionRequest, ReviewConfig, SubAgent } from "@/app/types/types";

interface SubAgentSectionProps {
  subAgents: SubAgent[];
  activeSubAgentId?: string | null;
  setActiveSubAgentId?: (id: string | null) => void;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  onResumeInterrupt?: (value: unknown) => void;
  isLoading?: boolean;
  messageId?: string; // Optional identifier to trigger resets
}

export const SubAgentSection = React.memo<SubAgentSectionProps>(
  ({
    subAgents,
    activeSubAgentId,
    setActiveSubAgentId,
    actionRequestsMap,
    reviewConfigsMap,
    onResumeInterrupt,
    isLoading,
    messageId,
  }) => {
    // Local state for main-flow expansion (Input/Output visibility)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const prevSubAgentsRef = React.useRef<SubAgent[]>([]);

    // 1. Thread switch reset
    // biome-ignore lint/correctness/useExhaustiveDependencies: <- We only want to reset on messageId change, not on every threadId change>
    React.useEffect(() => {
      setExpandedIds(new Set());
      prevSubAgentsRef.current = [];
    }, [messageId]);

    // 2. Auto-expand/collapse based on status TRANSITIONS (Active -> Expand, Finished -> Collapse)
    React.useEffect(() => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        let changed = false;

        subAgents.forEach((sa) => {
          const prevSa = prevSubAgentsRef.current.find((p) => p.id === sa.id);
          const prevStatus = prevSa?.status;
          const currentStatus = sa.status;

          // Transition to ACTIVE or INTERRUPTED: Auto-expand
          if (
            (currentStatus === "active" && prevStatus !== "active") ||
            currentStatus === "interrupted"
          ) {
            if (!next.has(sa.id)) {
              next.add(sa.id);
              changed = true;
            }
          }

          // Transition to FINISHED: Auto-collapse
          if (
            (currentStatus === "completed" || currentStatus === "error") &&
            prevStatus !== "completed" &&
            prevStatus !== "error" &&
            prevStatus !== undefined
          ) {
            if (next.has(sa.id)) {
              next.delete(sa.id);
              changed = true;
            }
          }
        });

        // Cleanup: Remove any IDs that no longer exist in the current subAgents list
        const currentIds = new Set(subAgents.map((sa) => sa.id));
        next.forEach((id) => {
          if (!currentIds.has(id)) {
            next.delete(id);
            changed = true;
          }
        });

        return changed ? next : prev;
      });

      prevSubAgentsRef.current = subAgents;
    }, [subAgents]); // REMOVED activeSubAgentId dependency to fix the bug

    const toggleExpand = useCallback((id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    // Reset expanded states when component unmounts or context changes
    // (though local state handles most thread-switch cases automatically)
    const handleShowLogs = useCallback(
      (id: string) => {
        if (!setActiveSubAgentId) return;

        // Don't open SubAgentPanel if subagent is in interrupted state
        const subAgent = subAgents.find((sa) => sa.id === id);
        if (subAgent?.status === "interrupted") {
          // Close panel if this interrupted subagent is currently active
          if (activeSubAgentId === id) {
            setActiveSubAgentId(null);
          }
          return;
        }

        // Toggle logic: if already active, close it
        setActiveSubAgentId(activeSubAgentId === id ? null : id);
      },
      [activeSubAgentId, setActiveSubAgentId, subAgents],
    );

    if (subAgents.length === 0) return null;

    return (
      <div className="mt-2 flex w-full max-w-full flex-col gap-2">
        {subAgents.map((subAgent) => {
          const isExpanded = expandedIds.has(subAgent.id);
          const isActiveInSidebar = activeSubAgentId === subAgent.id;

          return (
            <div
              key={subAgent.id}
              className="flex w-full flex-col"
            >
              <SubAgentIndicator
                subAgent={subAgent}
                onToggleExpand={() => toggleExpand(subAgent.id)}
                onShowLogs={() => handleShowLogs(subAgent.id)}
                isExpanded={isExpanded}
                isActiveInSidebar={isActiveInSidebar}
              />

              {isExpanded && (
                <SubAgentDetails
                  subAgent={subAgent}
                  taskActionRequest={actionRequestsMap?.get("task")}
                  taskReviewConfig={reviewConfigsMap?.get("task")}
                  onResumeInterrupt={onResumeInterrupt}
                  isLoading={isLoading}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

SubAgentSection.displayName = "SubAgentSection";
