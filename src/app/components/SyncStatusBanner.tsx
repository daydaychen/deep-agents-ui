import { CheckCircle2, Loader2 } from "lucide-react";

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
  syncingText = "Syncing historical messages…",
  syncedText = "History synchronized",
  showSynced = true,
}: SyncStatusBannerProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "syncing") {
    return (
      <div
        className="flex items-center justify-center gap-2 border-b border-blue-200/50 bg-blue-50/50 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-400"
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="h-3 w-3 animate-spin"
          aria-hidden="true"
        />
        <span>{syncingText}</span>
      </div>
    );
  }

  if (status === "synced" && showSynced) {
    return (
      <div
        className="flex items-center justify-center gap-2 border-b border-emerald-200/50 bg-emerald-50/50 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2
          size={12}
          className="text-emerald-500"
          aria-hidden="true"
        />
        <span>{syncedText}</span>
      </div>
    );
  }

  return null;
}
