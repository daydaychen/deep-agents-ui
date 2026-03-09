import { useCallback, useState } from "react";

/**
 * Manage expansion state for multiple subagents
 * - Default state is expanded (true)
 * - Provides methods to check and toggle expansion state
 */
export function useSubAgentExpansion() {
  const [expandedSubAgents, setExpandedSubAgents] = useState<
    Record<string, boolean>
  >({});

  const isSubAgentExpanded = useCallback(
    (id: string) => expandedSubAgents[id] ?? true,
    [expandedSubAgents]
  );

  const toggleSubAgent = useCallback((id: string) => {
    setExpandedSubAgents((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  }, []);

  return {
    isSubAgentExpanded,
    toggleSubAgent,
  };
}
