"use client";

import React, { useEffect, useMemo, useReducer } from "react";
import { InspectorContext } from "./inspector-context";
import { initialInspectorState, inspectorReducer } from "./inspector-reducer";

interface InspectorProviderProps {
  children: React.ReactNode;
  onSendMessage?: (message: string) => void;
}

export function InspectorProvider({ children, onSendMessage }: InspectorProviderProps) {
  const [state, dispatch] = useReducer(inspectorReducer, initialInspectorState);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl+I: toggle inspector
      if (mod && e.key === "i" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "TOGGLE_PANEL" });
      }
      // Escape: close inspector
      if (e.key === "Escape" && state.isOpen) {
        // Don't close if a dialog/modal is open
        const hasDialog = document.querySelector("[role='dialog']");
        if (!hasDialog) {
          dispatch({ type: "CLOSE_PANEL" });
        }
      }
      // Cmd/Ctrl+1-4: switch tabs
      if (mod && !e.shiftKey) {
        const tabMap: Record<string, "data" | "config" | "log" | "screenshot"> = {
          "1": "data",
          "2": "config",
          "3": "log",
          "4": "screenshot",
        };
        const tab = tabMap[e.key];
        if (tab && state.isOpen) {
          e.preventDefault();
          dispatch({ type: "SET_TAB", payload: tab });
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.isOpen]);

  const value = useMemo(
    () => ({ state, dispatch, onSendMessage }),
    // biome-ignore lint/correctness/useExhaustiveDependencies: dispatch is stable from useReducer but included for clarity
    [state, dispatch, onSendMessage],
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}
