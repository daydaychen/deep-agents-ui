export interface StandaloneConfig {
  assistantId: string;
  recursionLimit?: number;
  recursionMultiplier?: number;
  userId?: string;
}

const CONFIG_KEY = "databus-pilot-config";
const STORAGE_VERSION = 2;

interface StoredConfig {
  version: number;
  data: StandaloneConfig;
  timestamp: number;
}

// Cache for config to avoid repeated localStorage reads
let configCache: StandaloneConfig | null | undefined;

export function getConfig(): StandaloneConfig | null {
  if (typeof window === "undefined") return null;

  // Return cached value if available
  if (configCache !== undefined) {
    return configCache;
  }

  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) {
    configCache = null;
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as StoredConfig;
    // Validate version
    if (parsed.version !== STORAGE_VERSION) {
      configCache = null;
      return null;
    }
    configCache = parsed.data;
    return parsed.data;
  } catch {
    configCache = null;
    return null;
  }
}

export function saveConfig(config: StandaloneConfig): void {
  if (typeof window === "undefined") return;
  const stored: StoredConfig = {
    version: STORAGE_VERSION,
    data: config,
    timestamp: Date.now(),
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(stored));
  // Update cache to reflect the saved value
  configCache = config;
}

// Clear the config cache (useful for testing or when config might have changed externally)
export function clearConfigCache(): void {
  configCache = undefined;
}
