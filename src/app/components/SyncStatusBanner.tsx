import { CheckCircle } from "lucide-react";

type SyncStatus = "idle" | "syncing" | "synced";

interface SyncStatusBannerProps {
  status: SyncStatus;
  syncingText?: string;
  syncedText?: string;
  /**
   * Additional control for showing "synced" status
   * Useful when synced message needs to auto-hide after delay
   */
  showSynced?: boolean;
}

/**
 * Status banner for displaying sync progress
 * - Shows spinning indicator when syncing
 * - Shows success checkmark when synced (can be controlled via showSynced)
 * - Hidden when idle
 */
export function SyncStatusBanner({
  status,
  syncingText = "正在同步历史消息...",
  syncedText = "历史消息已同步",
  showSynced = true,
}: SyncStatusBannerProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "syncing") {
    return (
      <div
        className="flex items-center justify-center gap-2 border-b bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
        <span>{syncingText}</span>
      </div>
    );
  }

  if (status === "synced" && showSynced) {
    return (
      <div
        className="flex items-center justify-center gap-2 border-b bg-green-50 px-4 py-2 text-xs text-green-700 dark:bg-green-950 dark:text-green-300"
        role="status"
        aria-live="polite"
      >
        <CheckCircle
          size={14}
          aria-hidden="true"
        />
        <span>{syncedText}</span>
      </div>
    );
  }

  return null;
}
