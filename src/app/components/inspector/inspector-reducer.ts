import type { ConfigSnapshot, InspectorAction, InspectorState } from "./inspector-context";

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
          [taskName]: [...existing, snapshot],
        },
      };
    }

    case "PUSH_LOG": {
      const entries = Array.isArray(action.payload) ? action.payload : [action.payload];
      return {
        ...state,
        isOpen: true,
        activeTab: "log",
        logEntries: [...state.logEntries, ...entries],
      };
    }

    case "PUSH_TEST_RESULTS": {
      return {
        ...state,
        isOpen: true,
        activeTab: "data",
        testResults: [...state.testResults, ...action.payload],
      };
    }

    case "PUSH_SCREENSHOT": {
      return {
        ...state,
        isOpen: true,
        activeTab: "screenshot",
        screenshots: [...state.screenshots, action.payload],
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
