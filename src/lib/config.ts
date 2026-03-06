export interface StandaloneConfig {
  apiKey: string;
  model?: string;
  maxTurns?: number;
  userId?: string;
}

const CONFIG_KEY = "deep-agent-config";

export function getConfig(): StandaloneConfig | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    // Migration: map old LangGraph config fields to new
    if (parsed.deploymentUrl && !parsed.apiKey) {
      return {
        apiKey: parsed.langsmithApiKey ?? "",
        model: parsed.model,
        maxTurns: parsed.recursionLimit,
        userId: parsed.userId,
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveConfig(config: StandaloneConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
