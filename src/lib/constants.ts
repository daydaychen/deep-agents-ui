// Timeout and delay constants (in milliseconds)
export const TOAST_DURATION_MS = 5000;
export const COPY_SUCCESS_DURATION_MS = 2000;
export const BATCH_WRITE_INTERVAL_MS = 1000;
export const UI_UPDATE_THROTTLE_MS = 100;
export const LANGUAGE_SWITCH_DELAY_MS = 100;

// Data limit constants
export const DEFAULT_MESSAGE_LIMIT = 100;
export const DEFAULT_MEMORY_LIMIT = 100;
export const DEFAULT_THREAD_LIMIT = 100;
export const THREAD_TITLE_MAX_LENGTH = 50;
export const ERROR_MESSAGE_TRUNCATION_LENGTH = 50;

// UI animation duration constants (matching Tailwind CSS classes)
export const ANIMATION_DURATION_FAST_MS = 200;
export const ANIMATION_DURATION_NORMAL_MS = 300;

// Recursion and processing limits
export const DEFAULT_RECURSION_LIMIT = 100;

// Model options
export interface ModelOption {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "Qwen/Qwen3.5-397B-A17B",
    name: "Qwen 3.5 397B",
  },
  {
    id: "Qwen/Qwen3.5-122B-A10B",
    name: "Qwen 3.5 122B",
  },
  {
    id: "Qwen/Qwen3.5-35B-A3B",
    name: "Qwen 3.5 35B",
  },
  {
    id: "Qwen/Qwen3.5-27B",
    name: "Qwen 3.5 27B",
  },
  {
    id: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    name: "Qwen 3 Coder",
  },
  {
    id: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    name: "Qwen 3 Coder 30B",
  },
  {
    id: "Qwen/Qwen3-30B-A3B-Instruct-2507",
    name: "Qwen 3 30B Instruct",
  },
  {
    id: "Qwen/Qwen3-30B-A3B-Thinking-2507",
    name: "Qwen 3 30B Thinking",
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    name: "Qwen 3 235B",
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
    name: "Qwen 3 235B Thinking",
  },
  {
    id: "deepseek-ai/DeepSeek-V3.2",
    name: "DeepSeek V3.2",
  },
  {
    id: "MiniMax/MiniMax-M2.5",
    name: "MiniMax M2.5",
  },
  {
    id: "ZhipuAI/GLM-5",
    name: "GLM-5",
  },
  {
    id: "moonshotai/Kimi-K2.5",
    name: "Kimi K2.5",
  },
];
