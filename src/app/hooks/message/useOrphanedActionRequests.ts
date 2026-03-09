import type { ActionRequest, ReviewConfig, ToolCall } from "@/app/types/types";
import { useMemo } from "react";

export interface OrphanedApproval {
  actionRequest: ActionRequest;
  reviewConfig?: ReviewConfig;
}

/**
 * Find orphaned action requests that are in the actionRequestsMap
 * but don't have corresponding tool calls
 */
export function useOrphanedActionRequests(
  actionRequestsMap: Map<string, ActionRequest> | undefined,
  reviewConfigsMap: Map<string, ReviewConfig> | undefined,
  toolCalls: ToolCall[]
): OrphanedApproval[] {
  return useMemo(() => {
    if (!actionRequestsMap || actionRequestsMap.size === 0) return [];

    const toolCallNames = new Set(toolCalls.map((tc) => tc.name));
    const orphaned: OrphanedApproval[] = [];

    actionRequestsMap.forEach((actionRequest, toolName) => {
      if (!toolCallNames.has(toolName)) {
        orphaned.push({
          actionRequest,
          reviewConfig: reviewConfigsMap?.get(toolName),
        });
      }
    });

    return orphaned;
  }, [actionRequestsMap, reviewConfigsMap, toolCalls]);
}
