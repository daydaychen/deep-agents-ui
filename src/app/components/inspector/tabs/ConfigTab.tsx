"use client";

import JsonView from "@uiw/react-json-view";
import { lightTheme } from "@uiw/react-json-view/light";
import { vscodeTheme } from "@uiw/react-json-view/vscode";
import { type Change, diffLines } from "diff";
import { Copy, Download, GitCompareArrows, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { downloadFile } from "@/app/utils/download";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useInspector } from "../inspector-context";
import { ConfigTimeline } from "../widgets/ConfigTimeline";
import { EmptyState } from "../widgets/EmptyState";
import { PipelineGraph } from "../widgets/PipelineGraph";

export const ConfigTab = React.memo(() => {
  const { state } = useInspector();
  const t = useTranslations("inspector");
  const { resolvedTheme } = useTheme();
  const [showDiff, setShowDiff] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // Timeline state: null = show current, number = show snapshot at index
  const [timelineIndex, setTimelineIndex] = useState<number | null>(null);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  // Get the snapshots for the current task
  const snapshots = useMemo(() => {
    const taskName = state.configData.taskName;
    if (!taskName) return [];
    return state.configHistory[taskName] ?? [];
  }, [state.configData.taskName, state.configHistory]);

  // Determine which config to display: timeline selection or current
  const displayConfig = useMemo(() => {
    if (timelineIndex !== null && snapshots[timelineIndex]) {
      return snapshots[timelineIndex].config;
    }
    return state.configData.current;
  }, [timelineIndex, snapshots, state.configData.current]);

  const configDataObject = useMemo(() => {
    const data = selectedNode
      ? ((displayConfig as Record<string, unknown>)?.[selectedNode] ??
        ((displayConfig as Record<string, unknown>)?.stages as Record<string, unknown>)?.[
          selectedNode
        ] ??
        displayConfig)
      : displayConfig;
    return data;
  }, [displayConfig, selectedNode]);

  const configJson = useMemo(() => {
    if (!configDataObject) return "";
    try {
      return JSON.stringify(configDataObject, null, 2);
    } catch {
      return String(configDataObject);
    }
  }, [configDataObject]);

  // For diff: compare against previous snapshot or selected compare index
  const previousJson = useMemo(() => {
    if (compareIndex !== null && snapshots[compareIndex]) {
      try {
        return JSON.stringify(snapshots[compareIndex].config, null, 2);
      } catch {
        return "";
      }
    }
    if (!state.configData.previous) return "";
    try {
      return JSON.stringify(state.configData.previous, null, 2);
    } catch {
      return String(state.configData.previous);
    }
  }, [compareIndex, snapshots, state.configData.previous]);

  const hasDiff = previousJson.length > 0 && configJson.length > 0;
  const isComparing = compareIndex !== null;

  const diffResult = useMemo(() => {
    if (!hasDiff || (!showDiff && !isComparing)) return null;
    return diffLines(previousJson, configJson);
  }, [hasDiff, showDiff, isComparing, previousJson, configJson]);

  const handleTimelineSelect = useCallback(
    (index: number) => {
      setCompareIndex(null);
      if (index === snapshots.length - 1) {
        // Selecting latest = show current
        setTimelineIndex(null);
      } else {
        setTimelineIndex(index);
      }
    },
    [snapshots.length],
  );

  const handleTimelineCompare = useCallback(
    (index: number) => {
      if (compareIndex === index) {
        setCompareIndex(null);
      } else {
        setCompareIndex(index);
      }
    },
    [compareIndex],
  );

  const handleNodeClick = useCallback((name: string) => {
    setSelectedNode((prev) => (prev === name ? null : name));
  }, []);

  if (!state.configData.current) {
    return (
      <div className="h-full w-full">
        <EmptyState
          icon={Settings2}
          message={t("config.noConfig")}
        />
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(configJson);
    toast.success(t("actions.copy"));
  };

  const handleExport = () => {
    downloadFile(configJson, `${state.configData.taskName || "config"}.json`, "application/json");
  };

  const showDiffView = (showDiff || isComparing) && diffResult;

  return (
    <div className="flex h-full flex-col p-4 min-w-0">
      <div className="shrink-0 space-y-3 pb-3 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 truncate">
              {showDiffView ? t("config.diffView") : t("config.currentConfig")}
            </h3>
            {state.configData.taskName && (
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {state.configData.taskName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {hasDiff && !isComparing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiff(!showDiff)}
                className={cn("h-7 gap-1 px-2 text-xs", showDiff && "bg-primary/10 text-primary")}
              >
                <GitCompareArrows className="h-3 w-3" />
                Diff
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-7 w-7"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              className="h-7 w-7"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Config History Timeline */}
        <div className="min-w-0">
          <ConfigTimeline
            snapshots={snapshots}
            selectedIndex={timelineIndex}
            compareIndex={compareIndex}
            onSelect={handleTimelineSelect}
            onCompare={handleTimelineCompare}
          />
        </div>

        {/* Pipeline Graph */}
        <div className="min-w-0">
          <PipelineGraph onNodeClick={handleNodeClick} />
        </div>

        {/* Selected node indicator */}
        {selectedNode && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary truncate max-w-[150px]">
              {selectedNode}
            </span>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="shrink-0 text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
            >
              {t("config.showAll")}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/40 bg-zinc-950/5 dark:bg-zinc-950/50">
        <ScrollArea className="h-full w-full">
          {showDiffView ? (
            <pre className="m-0 p-4 font-mono text-[11px] leading-relaxed">
              {diffResult.map((part: Change, i: number) => (
                <span
                  key={`${part.added ? "a" : part.removed ? "r" : "u"}-${i}`}
                  className={cn(
                    part.added &&
                      "bg-[color:color-mix(in_srgb,var(--color-success),transparent_80%)] text-[var(--color-success)]",
                    part.removed &&
                      "bg-[color:color-mix(in_srgb,var(--color-error),transparent_80%)] text-destructive line-through",
                  )}
                >
                  {part.value}
                </span>
              ))}
            </pre>
          ) : (
            <div className="p-4">
              <JsonView
                value={configDataObject as object}
                style={resolvedTheme === "dark" ? vscodeTheme : lightTheme}
                className="bg-transparent! text-[11px]"
                displayDataTypes={false}
                displayObjectSize={false}
              />
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
});

ConfigTab.displayName = "ConfigTab";
