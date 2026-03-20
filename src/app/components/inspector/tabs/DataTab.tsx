"use client";

import { Database } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { useInspector } from "../inspector-context";

export const DataTab = React.memo(() => {
  const { state } = useInspector();
  const t = useTranslations("inspector");

  if (state.testResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <Database
          size={32}
          className="mb-4 text-muted-foreground/20"
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">
          {t("data.noData")}
        </p>
      </div>
    );
  }

  // Render as simple table
  const firstRow = state.testResults[0];
  const columns = firstRow ? Object.keys(firstRow) : [];

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          {t("data.structuredData")}
        </h3>
        <span className="text-xs text-muted-foreground/40">
          {state.testResults.length} {t("data.rows")}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
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
            {state.testResults.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/20 hover:bg-muted/10"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="max-w-[200px] truncate px-3 py-2 font-mono text-[11px] text-foreground/80"
                  >
                    {typeof row[col] === "object"
                      ? JSON.stringify(row[col])
                      : String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

DataTab.displayName = "DataTab";
