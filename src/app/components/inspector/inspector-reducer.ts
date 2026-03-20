import type { ConfigSnapshot, InspectorAction, InspectorState } from "./inspector-context";

const MAX_LOG_ENTRIES = 500;
const MAX_SCREENSHOTS = 20;
const MAX_CONFIG_SNAPSHOTS = 30;
const MAX_TEST_RESULTS = 200;

export const initialInspectorState: InspectorState = {
  isOpen: false,
  activeTab: "config",
  configData: {
    current: null,
    previous: null,
    taskName: null,
  },
  configHistory: {},
  logEntries: [],
  testResults: [],
  screenshots: [],
  validationResult: null,
};

export function inspectorReducer(state: InspectorState, action: InspectorAction): InspectorState {
  switch (action.type) {
    case "PUSH_CONFIG": {
      const { config, taskName, toolCallId } = action.payload;
      const snapshot: ConfigSnapshot = {
        timestamp: Date.now(),
        config,
        source: taskName,
        toolCallId,
      };
      const existing = state.configHistory[taskName] ?? [];
      const previousConfig = existing.length > 0 ? existing[existing.length - 1].config : null;
      const combined = [...existing, snapshot];
      const capped =
        combined.length > MAX_CONFIG_SNAPSHOTS ? combined.slice(-MAX_CONFIG_SNAPSHOTS) : combined;
      return {
        ...state,
        isOpen: true,
        activeTab: "config",
        configData: {
          current: config,
          previous: previousConfig,
          taskName,
        },
        configHistory: {
          ...state.configHistory,
          [taskName]: capped,
        },
      };
    }

    case "PUSH_LOG": {
      const entries = Array.isArray(action.payload) ? action.payload : [action.payload];
      const combined = [...state.logEntries, ...entries];
      return {
        ...state,
        isOpen: true,
        activeTab: "log",
        logEntries: combined.length > MAX_LOG_ENTRIES ? combined.slice(-MAX_LOG_ENTRIES) : combined,
      };
    }

    case "PUSH_TEST_RESULTS": {
      const combined = [...state.testResults, ...action.payload];
      return {
        ...state,
        isOpen: true,
        activeTab: "data",
        testResults:
          combined.length > MAX_TEST_RESULTS ? combined.slice(-MAX_TEST_RESULTS) : combined,
      };
    }

    case "PUSH_SCREENSHOT": {
      const combined = [...state.screenshots, action.payload];
      return {
        ...state,
        isOpen: true,
        activeTab: "screenshot",
        screenshots:
          combined.length > MAX_SCREENSHOTS ? combined.slice(-MAX_SCREENSHOTS) : combined,
      };
    }

    case "PUSH_VALIDATION": {
      return {
        ...state,
        isOpen: true,
        activeTab: "log",
        validationResult: action.payload,
      };
    }

    case "SET_TAB": {
      return { ...state, activeTab: action.payload };
    }

    case "TOGGLE_PANEL": {
      return { ...state, isOpen: !state.isOpen };
    }

    case "OPEN_PANEL": {
      return {
        ...state,
        isOpen: true,
        ...(action.payload ? { activeTab: action.payload } : {}),
      };
    }

    case "CLOSE_PANEL": {
      return { ...state, isOpen: false };
    }

    case "CLEAR": {
      return { ...initialInspectorState };
    }

    default:
      return state;
  }
}
