interface ActiveSession {
  threadId: string;
  abortController: AbortController;
  startedAt: Date;
}

class SessionManager {
  private active = new Map<string, ActiveSession>();
  private maxConcurrent: number;

  constructor() {
    this.maxConcurrent = parseInt(
      process.env.MAX_CONCURRENT_SESSIONS ?? "5",
      10
    );
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

  getActive(): ActiveSession[] {
    return Array.from(this.active.values());
  }

  getActiveCount(): number {
    return this.active.size;
  }

  has(threadId: string): boolean {
    return this.active.has(threadId);
  }
}

export const sessionManager = new SessionManager();
