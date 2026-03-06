interface ActiveSession {
  threadId: string;
  abortController: AbortController;
  startedAt: Date;
}

const DEFAULT_MAX_CONCURRENT = 5;
const DEFAULT_MAX_SESSION_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes
const REAPER_INTERVAL_MS = 60 * 1000; // 60 seconds

class SessionManager {
  private active = new Map<string, ActiveSession>();
  private maxConcurrent: number;
  private maxLifetimeMs: number;
  private reaperTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const parsedConcurrent = parseInt(
      process.env.MAX_CONCURRENT_SESSIONS ?? String(DEFAULT_MAX_CONCURRENT),
      10
    );
    this.maxConcurrent = Number.isNaN(parsedConcurrent)
      ? DEFAULT_MAX_CONCURRENT
      : parsedConcurrent;

    const parsedLifetime = parseInt(
      process.env.MAX_SESSION_LIFETIME_MS ??
        String(DEFAULT_MAX_SESSION_LIFETIME_MS),
      10
    );
    this.maxLifetimeMs = Number.isNaN(parsedLifetime)
      ? DEFAULT_MAX_SESSION_LIFETIME_MS
      : parsedLifetime;

    this.startReaper();
  }

  private startReaper(): void {
    if (this.reaperTimer) return;
    this.reaperTimer = setInterval(() => this.reapOrphanedSessions(), REAPER_INTERVAL_MS);
    // Allow the process to exit even if the timer is still running
    if (this.reaperTimer && typeof this.reaperTimer === "object" && "unref" in this.reaperTimer) {
      this.reaperTimer.unref();
    }
  }

  private reapOrphanedSessions(): void {
    const now = Date.now();
    for (const [threadId, session] of this.active) {
      if (now - session.startedAt.getTime() > this.maxLifetimeMs) {
        try {
          session.abortController.abort();
        } catch {
          // Abort may throw if already aborted; safe to ignore
        }
        this.active.delete(threadId);
      }
    }
  }

  canStart(): boolean {
    return this.active.size < this.maxConcurrent;
  }

  register(threadId: string, abort: AbortController): void {
    this.active.set(threadId, {
      threadId,
      abortController: abort,
      startedAt: new Date(),
    });
  }

  unregister(threadId: string): void {
    this.active.delete(threadId);
  }

  stop(threadId: string): boolean {
    const session = this.active.get(threadId);
    if (!session) return false;
    session.abortController.abort();
    this.active.delete(threadId);
    return true;
  }
}

export const sessionManager = new SessionManager();
