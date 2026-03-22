import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useThreadGrouping, getThreadGroupKeys } from "./useThreadGrouping";
import type { ThreadItem } from "@/app/hooks/useThreads";

const mockThread = (id: string, updatedAt: Date, status: ThreadItem["status"] = "idle"): ThreadItem => ({
  id,
  updatedAt,
  status,
  title: `Thread ${id}`,
  description: `Description ${id}`,
  messageCount: 0,
});

describe("useThreadGrouping", () => {
  const now = new Date("2024-05-20T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty groups for empty threads array", () => {
    const { result } = renderHook(() => useThreadGrouping([]));
    expect(result.current).toEqual({
      interrupted: [],
      today: [],
      yesterday: [],
      week: [],
      older: [],
    });
  });

  it("groups interrupted threads separately regardless of date", () => {
    const interruptedThread = mockThread("1", new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), "interrupted");
    const { result } = renderHook(() => useThreadGrouping([interruptedThread]));

    expect(result.current.interrupted).toHaveLength(1);
    expect(result.current.interrupted[0].id).toBe("1");
    expect(result.current.older).toHaveLength(0);
  });

  it("groups threads by today", () => {
    const todayThread = mockThread("2", new Date(now.getTime() - 2 * 60 * 60 * 1000)); // 2 hours ago
    const { result } = renderHook(() => useThreadGrouping([todayThread]));

    expect(result.current.today).toHaveLength(1);
    expect(result.current.today[0].id).toBe("2");
  });

  it("groups threads by yesterday", () => {
    const yesterdayThread = mockThread("3", new Date(now.getTime() - 25 * 60 * 60 * 1000)); // 25 hours ago
    const { result } = renderHook(() => useThreadGrouping([yesterdayThread]));

    expect(result.current.yesterday).toHaveLength(1);
    expect(result.current.yesterday[0].id).toBe("3");
  });

  it("groups threads by this week", () => {
    const weekThread = mockThread("4", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)); // 3 days ago
    const { result } = renderHook(() => useThreadGrouping([weekThread]));

    expect(result.current.week).toHaveLength(1);
    expect(result.current.week[0].id).toBe("4");
  });

  it("groups threads by older", () => {
    const olderThread = mockThread("5", new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)); // 8 days ago
    const { result } = renderHook(() => useThreadGrouping([olderThread]));

    expect(result.current.older).toHaveLength(1);
    expect(result.current.older[0].id).toBe("5");
  });

  it("groups multiple threads correctly", () => {
    const threads: ThreadItem[] = [
      mockThread("1", now, "interrupted"),
      mockThread("2", now),
      mockThread("3", new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      mockThread("4", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
      mockThread("5", new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)),
    ];

    const { result } = renderHook(() => useThreadGrouping(threads));

    expect(result.current.interrupted).toHaveLength(1);
    expect(result.current.today).toHaveLength(1);
    expect(result.current.yesterday).toHaveLength(1);
    expect(result.current.week).toHaveLength(1);
    expect(result.current.older).toHaveLength(1);

    expect(result.current.interrupted[0].id).toBe("1");
    expect(result.current.today[0].id).toBe("2");
    expect(result.current.yesterday[0].id).toBe("3");
    expect(result.current.week[0].id).toBe("4");
    expect(result.current.older[0].id).toBe("5");
  });
});

describe("getThreadGroupKeys", () => {
  it("returns keys in the correct order", () => {
    const keys = getThreadGroupKeys();
    expect(keys).toEqual(["interrupted", "today", "yesterday", "week", "older"]);
  });
});
