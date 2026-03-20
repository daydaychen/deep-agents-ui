"use client";

import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useInspector } from "../inspector-context";

// --- Types ---

interface PipelineNode {
  name: string;
  type: string;
  fieldCount: number;
  status: "ok" | "warning" | "error" | "pending";
  config: Record<string, unknown>;
}

interface PipelineEdge {
  from: string;
  to: string;
}

interface ParsedPipeline {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

// --- Config Parsing ---

/**
 * Attempts to extract pipeline stages from the config JSON.
 * Supports multiple formats from task_stages_get:
 * 1. { "stages": { "name": { ... } } }
 * 2. { "name": { "stage_type": "...", ... } }
 * 3. Array format: [{ "name": "...", "stage_type": "..." }]
 */
function parsePipelineFromConfig(
  config: Record<string, unknown>,
  validation: { errors: string[]; warnings: string[] } | null,
): ParsedPipeline {
  let stagesMap: Record<string, Record<string, unknown>> = {};

  // Format 1: { stages: { ... } }
  if (config.stages && typeof config.stages === "object" && !Array.isArray(config.stages)) {
    stagesMap = config.stages as Record<string, Record<string, unknown>>;
  }
  // Format 3: Array
  else if (Array.isArray(config.stages)) {
    for (const s of config.stages) {
      if (s && typeof s === "object" && "name" in s) {
        stagesMap[String(s.name)] = s as Record<string, unknown>;
      }
    }
  }
  // Format 2: top-level keys that look like stages
  else {
    for (const [key, val] of Object.entries(config)) {
      if (
        val &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        ("stage_type" in val || "type" in val || "config" in val || "fields" in val)
      ) {
        stagesMap[key] = val as Record<string, unknown>;
      }
    }
  }

  if (Object.keys(stagesMap).length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: PipelineNode[] = [];
  const edges: PipelineEdge[] = [];

  for (const [name, stage] of Object.entries(stagesMap)) {
    const stageType = String(stage.stage_type ?? stage.type ?? "unknown");
    const fields = Array.isArray(stage.fields) ? stage.fields : [];
    const fieldCount = fields.length;

    // Determine status from validation
    let status: PipelineNode["status"] = "ok";
    if (validation) {
      const hasError = validation.errors.some((e) => e.toLowerCase().includes(name.toLowerCase()));
      const hasWarning = validation.warnings.some((w) =>
        w.toLowerCase().includes(name.toLowerCase()),
      );
      if (hasError) status = "error";
      else if (hasWarning) status = "warning";
    }

    // Check if node seems unconfigured
    const configObj = stage.config as Record<string, unknown> | undefined;
    if (!configObj || Object.keys(configObj).length === 0) {
      if (status === "ok" && stageType !== "start") {
        status = "pending";
      }
    }

    nodes.push({
      name,
      type: stageType,
      fieldCount,
      status,
      config: stage,
    });

    // Extract edges from relationships
    const nextStages = (stage.next_stages ?? stage.next ?? stage.relationships) as
      | string[]
      | undefined;
    if (Array.isArray(nextStages)) {
      for (const target of nextStages) {
        if (typeof target === "string") {
          edges.push({ from: name, to: target });
        }
      }
    }
  }

  // If no explicit edges but multiple nodes, create linear chain
  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ from: nodes[i].name, to: nodes[i + 1].name });
    }
  }

  return { nodes, edges };
}

// --- Status colors ---

const STATUS_STYLES: Record<PipelineNode["status"], { border: string; bg: string; dot: string }> = {
  ok: {
    border: "border-[var(--color-success)]/40",
    bg: "bg-[color:color-mix(in_srgb,var(--color-success),transparent_92%)]",
    dot: "bg-[var(--color-success)]",
  },
  warning: {
    border: "border-[var(--color-warning)]/40",
    bg: "bg-[color:color-mix(in_srgb,var(--color-warning),transparent_92%)]",
    dot: "bg-[var(--color-warning)]",
  },
  error: {
    border: "border-destructive/40",
    bg: "bg-destructive/5",
    dot: "bg-destructive",
  },
  pending: {
    border: "border-border",
    bg: "bg-muted/30",
    dot: "bg-muted-foreground/30",
  },
};

// --- Component ---

interface PipelineGraphProps {
  onNodeClick?: (nodeName: string, nodeConfig: Record<string, unknown>) => void;
}

export const PipelineGraph = React.memo<PipelineGraphProps>(({ onNodeClick }) => {
  const { state } = useInspector();
  const t = useTranslations("inspector");

  const pipeline = useMemo(() => {
    if (!state.configData.current) return null;
    const validation = state.validationResult
      ? { errors: state.validationResult.errors, warnings: state.validationResult.warnings }
      : null;
    return parsePipelineFromConfig(state.configData.current as Record<string, unknown>, validation);
  }, [state.configData.current, state.validationResult]);

  if (!pipeline || pipeline.nodes.length === 0) return null;

  return (
    <div className="mb-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
        {t("config.pipeline")}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-border/40 bg-muted/10 p-3">
        <div className="flex items-center gap-0">
          {pipeline.nodes.map((node, i) => {
            const styles = STATUS_STYLES[node.status];
            return (
              <React.Fragment key={node.name}>
                {/* Node */}
                <button
                  type="button"
                  onClick={() => onNodeClick?.(node.name, node.config)}
                  className={cn(
                    "group flex shrink-0 flex-col items-center gap-1 rounded-lg border p-2.5 transition-all hover:scale-105",
                    styles.border,
                    styles.bg,
                    onNodeClick && "cursor-pointer",
                  )}
                  style={{ minWidth: "5.5rem" }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
                    <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[6rem]">
                      {node.name}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/60">{node.type}</span>
                  {node.fieldCount > 0 && (
                    <span className="text-[9px] text-muted-foreground/40">
                      {node.fieldCount} {t("config.fields")}
                    </span>
                  )}
                </button>

                {/* Arrow connector */}
                {i < pipeline.nodes.length - 1 && (
                  <div className="flex shrink-0 items-center px-1">
                    <div className="h-px w-4 bg-border" />
                    <div className="h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-border" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
});

PipelineGraph.displayName = "PipelineGraph";
