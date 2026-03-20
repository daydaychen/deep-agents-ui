"use client";

import { type Change, diffLines } from "diff";
import { Copy, Download, GitCompareArrows, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import React, { useMemo, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInspector } from "../inspector-context";
import { PipelineGraph } from "../widgets/PipelineGraph";

export const ConfigTab = React.memo(() => {
  const { state } = useInspector();
  const t = useTranslations("inspector");
  const { resolvedTheme } = useTheme();
  const [showDiff, setShowDiff] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const isDark = resolvedTheme === "dark";
  const syntaxStyle = isDark ? atomOneDark : atomOneLight;

  const configJson = useMemo(() => {
    const data = selectedNode
      ? ((state.configData.current as Record<string, unknown>)?.[selectedNode] ??
        (
          (state.configData.current as Record<string, unknown>)?.stages as Record<string, unknown>
        )?.[selectedNode] ??
        state.configData.current)
      : state.configData.current;
    if (!data) return "";
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [state.configData.current, selectedNode]);

  const previousJson = useMemo(() => {
    if (!state.configData.previous) return "";
    try {
      return JSON.stringify(state.configData.previous, null, 2);
    } catch {
      return String(state.configData.previous);
    }
  }, [state.configData.previous]);

  const hasDiff = !!state.configData.previous && !!state.configData.current;

  const diffResult = useMemo(() => {
    if (!hasDiff || !showDiff) return null;
    return diffLines(previousJson, configJson);
  }, [hasDiff, showDiff, previousJson, configJson]);

  if (!state.configData.current) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <Settings2
          size={32}
          className="mb-4 text-muted-foreground/20"
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">
          {t("config.noConfig")}
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(configJson);
    toast.success(t("actions.copy"));
  };

  const handleExport = () => {
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.configData.taskName || "config"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            {showDiff ? t("config.diffView") : t("config.currentConfig")}
          </h3>
          {state.configData.taskName && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {state.configData.taskName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasDiff && (
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

      {/* Pipeline Graph */}
      <PipelineGraph
        onNodeClick={(name) => {
          setSelectedNode((prev) => (prev === name ? null : name));
        }}
      />

      {/* Selected node indicator */}
      {selectedNode && (
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {selectedNode}
          </span>
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
          >
            {t("config.showAll")}
          </button>
        </div>
      )}

      {/* Content */}
      {showDiff && diffResult ? (
        <div className="overflow-auto rounded-lg border border-border/40 bg-muted/10 p-0">
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
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border/40">
          <SyntaxHighlighter
            language="json"
            style={syntaxStyle}
            customStyle={{
              margin: 0,
              padding: "1rem",
              fontSize: "11px",
              lineHeight: "1.6",
              background: "transparent",
              borderRadius: "0.5rem",
            }}
            wrapLongLines
          >
            {configJson}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
});

ConfigTab.displayName = "ConfigTab";
