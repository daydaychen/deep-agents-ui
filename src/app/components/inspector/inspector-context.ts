"use client";

import { createContext, useContext } from "react";

// --- Types ---

export type InspectorTab = "data" | "config" | "log" | "screenshot";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "success";
  content: string;
  extra?: unknown;
}

export interface Screenshot {
  id: string;
  timestamp: number;
  data: string; // base64 or URL
  label?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigSnapshot {
  timestamp: number;
  config: Record<string, unknown>;
  source: string; // which tool call produced it
  toolCallId?: string;
}

export interface InspectorState {
  isOpen: boolean;
  activeTab: InspectorTab;
  // Config tab data
  configData: {
    current: Record<string, unknown> | null;
    previous: Record<string, unknown> | null;
    taskName: string | null;
  };
  configHistory: Record<string, ConfigSnapshot[]>;
  // Log tab data
  logEntries: LogEntry[];
  // Data tab (structured test results)
  testResults: Record<string, unknown>[];
  // Screenshot tab
  screenshots: Screenshot[];
  // Validation
  validationResult: ValidationResult | null;
}

// --- Actions ---

export type InspectorAction =
  | {
      type: "PUSH_CONFIG";
      payload: {
        config: Record<string, unknown>;
        taskName: string;
        stageName?: string;
        toolCallId?: string;
      };
    }
  | { type: "PUSH_LOG"; payload: LogEntry | LogEntry[] }
  | { type: "PUSH_TEST_RESULTS"; payload: Record<string, unknown>[] }
  | { type: "PUSH_SCREENSHOT"; payload: Screenshot }
  | { type: "PUSH_VALIDATION"; payload: ValidationResult }
  | { type: "SET_TAB"; payload: InspectorTab }
  | { type: "TOGGLE_PANEL" }
  | { type: "OPEN_PANEL"; payload?: InspectorTab }
  | { type: "CLOSE_PANEL" }
  | { type: "CLEAR" };

// --- Context ---

export interface InspectorContextValue {
  state: InspectorState;
  dispatch: React.Dispatch<InspectorAction>;
  onSendMessage?: (message: string) => void;
}

export const InspectorContext = createContext<InspectorContextValue | null>(null);

export function useInspector() {
  const ctx = useContext(InspectorContext);
  if (!ctx) {
    throw new Error("useInspector must be used within InspectorProvider");
  }
  return ctx;
}

export function useInspectorOptional() {
  return useContext(InspectorContext);
}
