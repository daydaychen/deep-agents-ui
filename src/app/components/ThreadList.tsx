"use client";

import { Loader2, MessageSquare, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ThreadGroup } from "@/app/components/thread/ThreadGroup";
import { type StatusFilter, ThreadStatusFilter } from "@/app/components/thread/ThreadStatusFilter";
import { getThreadGroupKeys, useThreadGrouping } from "@/app/hooks/thread/useThreadGrouping";
import { useDeleteThread, useMarkThreadAsResolved, useThreads } from "@/app/hooks/useThreads";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Static JSX elements - hoisted outside components to avoid recreation
const loadingSkeletonElements = (
  <div className="space-y-2 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-16 w-full"
      />
    ))}
  </div>
);

function ErrorState({ message }: { message: string }) {
  const t = useTranslations("thread");
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-sm text-red-600">{t("loadThreadsFailed")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingState() {
  return loadingSkeletonElements;
}

function EmptyState() {
  const t = useTranslations("thread");
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center opacity-50">
      <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/30" />
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {t("noThreads")}
      </p>
    </div>
  );
}

interface ThreadListProps {
  onThreadSelect: (id: string | null) => void;
  onMutateReady?: (mutate: () => void) => void;
  onClose?: () => void;
  onInterruptCountChange?: (count: number) => void;
}

export function ThreadList({
  onThreadSelect,
  onMutateReady,
  onClose,
  onInterruptCountChange,
}: ThreadListProps) {
  const t = useTranslations("thread");
  const { trigger: deleteThread } = useDeleteThread();
  const { trigger: markThreadAsResolved } = useMarkThreadAsResolved();

  // State hooks first
  const [currentThreadId, setCurrentThreadId] = useQueryState("threadId");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (filter: StatusFilter) => {
    startTransition(() => {
      setStatusFilter(filter);
    });
  };

  const threads = useThreads({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 20,
  });

  const flattened = useMemo(() => {
    return threads.data?.flat() ?? [];
  }, [threads.data]);

  const isLoadingMore = threads.size > 0 && threads.data?.[threads.size - 1] == null;
  const isEmpty = threads.data?.at(0)?.length === 0;
  const isReachingEnd = isEmpty || (threads.data?.at(-1)?.length ?? 0) < 20;

  // Group threads by time and status using the custom hook
  const grouped = useThreadGrouping(flattened);

  const interruptedCount = flattened.filter((t) => t.status === "interrupted").length;

  // Expose thread list revalidation to parent component
  // Use refs to create a stable callback that always calls the latest mutate function
  const onMutateReadyRef = useRef(onMutateReady);
  const mutateRef = useRef(threads.mutate);

  useEffect(() => {
    onMutateReadyRef.current = onMutateReady;
  }, [onMutateReady]);

  useEffect(() => {
    mutateRef.current = threads.mutate;
  }, [threads.mutate]);

  const mutateFn = useCallback(() => {
    mutateRef.current();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <Only run once on mount to avoid infinite loops>
  useEffect(() => {
    onMutateReadyRef.current?.(mutateFn);
  }, []);

  // Notify parent of interrupt count changes
  useEffect(() => {
    onInterruptCountChange?.(interruptedCount);
  }, [interruptedCount, onInterruptCountChange]);

  // Callbacks - placed after all other hooks
  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      try {
        if (currentThreadId === threadId) {
          setCurrentThreadId(null);
        }

        await deleteThread({ threadId });
        // Trigger revalidation to update the list
        if (mutateFn) {
          mutateFn();
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
      }
    },
    [currentThreadId, deleteThread, mutateFn, setCurrentThreadId],
  );

  const handleMarkAsResolved = useCallback(
    async (threadId: string, assistantId?: string) => {
      try {
        await markThreadAsResolved({ threadId, assistantId });
        // Trigger revalidation to update the list
        if (mutateFn) {
          mutateFn();
        }
      } catch (error) {
        console.error("Failed to mark thread as resolved:", error);
      }
    },
    [markThreadAsResolved, mutateFn],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header with title, filter, and close button */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/80">
            {t("title")}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <ThreadStatusFilter
            value={statusFilter}
            onChange={handleFilterChange}
            interruptedCount={interruptedCount}
          />
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-full hover:bg-muted"
              aria-label={t("closeSidebar")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative h-0 flex-1">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <ScrollArea className={cn("h-full w-full", isPending && "opacity-50")}>
          {threads.error && <ErrorState message={threads.error.message} />}

          {!threads.error && !threads.data && threads.isLoading && <LoadingState />}

          {!threads.error && !threads.isLoading && isEmpty && <EmptyState />}

          {!threads.error && !isEmpty && (
            <div className="box-border w-full max-w-full overflow-hidden px-2 pb-6 pt-2">
              {getThreadGroupKeys().map((groupType) => (
                <ThreadGroup
                  key={groupType}
                  groupType={groupType}
                  threads={grouped[groupType]}
                  currentThreadId={currentThreadId}
                  onThreadSelect={onThreadSelect}
                  onMarkAsResolved={handleMarkAsResolved}
                  onDeleteThread={handleDeleteThread}
                />
              ))}

              {!isReachingEnd && (
                <div className="flex justify-center py-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-dashed px-6 text-xs"
                    onClick={() => threads.setSize((size) => size + 1)}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="mr-2 animate-spin">
                          <Loader2 className="h-3.5 w-3.5" />
                        </div>
                        {t("loading")}
                      </>
                    ) : (
                      t("loadMore")
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
