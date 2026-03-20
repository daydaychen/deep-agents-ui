"use client";

import { Copy, Database, Download, Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { downloadFile } from "@/app/utils/download";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInspector } from "../inspector-context";
import { EmptyState } from "../widgets/EmptyState";

export const DataTab = React.memo(() => {
  const { state } = useInspector();
  const t = useTranslations("inspector");
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const columns = useMemo(() => {
    if (state.testResults.length === 0) return [];
    return Object.keys(state.testResults[0]);
  }, [state.testResults]);

  const handleCopyJSON = useCallback(() => {
    const json = JSON.stringify(state.testResults, null, 2);
    navigator.clipboard.writeText(json);
    toast.success(t("actions.copy"));
  }, [state.testResults, t]);

  const handleExportJSON = useCallback(() => {
    const json = JSON.stringify(state.testResults, null, 2);
    downloadFile(json, "data.json", "application/json");
  }, [state.testResults]);

  const handleExportCSV = useCallback(() => {
    if (columns.length === 0) return;
    const csvEscape = (v: string) => {
      let safe = v;
      // Prefix formula-trigger characters to prevent CSV injection
      if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
      if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
        return `"${safe.replace(/"/g, '""')}"`;
      }
      return safe;
    };
    const header = columns.map(csvEscape).join(",");
    const rows = state.testResults.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          return csvEscape(typeof val === "object" ? JSON.stringify(val) : String(val ?? ""));
        })
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    downloadFile(csv, "data.csv", "text/csv");
  }, [state.testResults, columns]);

  if (state.testResults.length === 0) {
    return (
      <EmptyState
        icon={Database}
        message={t("data.noData")}
      />
    );
  }

  return (
    <div className="p-4">
      {/* Header with export actions */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            {t("data.structuredData")}
          </h3>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {state.testResults.length} {t("data.rows")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyJSON}
            className="h-7 w-7"
            title={t("actions.copy")}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportJSON}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Download className="h-3 w-3" />
            JSON
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCSV}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Download className="h-3 w-3" />
            CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="w-8 px-2 py-2 text-center font-semibold text-muted-foreground/50">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-muted-foreground/70"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.testResults.map((row, rowIdx) => (
              <tr
                key={`row-${rowIdx}`}
                className="border-b border-border/20 hover:bg-muted/10"
              >
                <td className="px-2 py-2 text-center font-mono text-[10px] text-muted-foreground/40">
                  {rowIdx + 1}
                </td>
                {columns.map((col) => {
                  const cellKey = `${rowIdx}-${col}`;
                  const isExpanded = expandedCell === cellKey;
                  const rawVal = row[col];
                  const strVal =
                    typeof rawVal === "object" ? JSON.stringify(rawVal) : String(rawVal ?? "");
                  const isLong = strVal.length > 60;

                  return (
                    <td
                      key={col}
                      className="relative px-3 py-2 font-mono text-[11px] text-foreground/80"
                    >
                      <div className="flex items-start gap-1">
                        <span
                          className={cn(
                            "break-all",
                            !isExpanded && isLong && "line-clamp-2 max-w-[200px]",
                          )}
                        >
                          {strVal}
                        </span>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => setExpandedCell(isExpanded ? null : cellKey)}
                            className="mt-0.5 shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
                          >
                            {isExpanded ? (
                              <Minimize2 className="h-3 w-3" />
                            ) : (
                              <Maximize2 className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

DataTab.displayName = "DataTab";
