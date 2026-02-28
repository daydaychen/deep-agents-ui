"use client";

import { SubAgentIndicator } from "@/app/components/SubAgentIndicator";
import { SubAgentDetails } from "@/app/components/message/SubAgentDetails";
import type { ActionRequest, ReviewConfig, SubAgent } from "@/app/types/types";
import React, { useState, useCallback } from "react";

interface SubAgentSectionProps {
  subAgents: SubAgent[];
  activeSubAgentId?: string | null;
  setActiveSubAgentId?: (id: string | null) => void;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  onResumeInterrupt?: (value: any) => void;
  isLoading?: boolean;
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
  }) => {
    // Local state for main-flow expansion (Input/Output visibility)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = useCallback((id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    const handleShowLogs = useCallback((id: string) => {
      if (setActiveSubAgentId) {
        // Toggle logic: if already active, close it
        setActiveSubAgentId(activeSubAgentId === id ? null : id);
      }
    }, [activeSubAgentId, setActiveSubAgentId]);

    if (subAgents.length === 0) return null;

    return (
      <div className="mt-6 flex w-full max-w-full flex-col gap-3">
        {subAgents.map((subAgent) => {
          const isExpanded = expandedIds.has(subAgent.id);
          const isActiveInSidebar = activeSubAgentId === subAgent.id;

          return (
            <div key={subAgent.id} className="flex w-full flex-col">
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
  }
);

SubAgentSection.displayName = "SubAgentSection";
