"use client";

import { Clock, GitCompareArrows } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { cn } from "@/lib/utils";
import type { ConfigSnapshot } from "../inspector-context";

interface ConfigTimelineProps {
  snapshots: ConfigSnapshot[];
  selectedIndex: number | null;
  compareIndex: number | null;
  onSelect: (index: number) => void;
  onCompare: (index: number) => void;
}

export const ConfigTimeline = React.memo<ConfigTimelineProps>(
  ({ snapshots, selectedIndex, compareIndex, onSelect, onCompare }) => {
    const t = useTranslations("inspector");

    if (snapshots.length < 2) return null;

    return (
      <div className="mb-1">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground/50" />
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {t("config.history")}
          </h4>
          <span className="text-[10px] text-muted-foreground/30">
            {snapshots.length} {t("config.versions")}
          </span>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto rounded-lg border border-border/30 bg-muted/10 px-2 py-2">
          {snapshots.map((snap, i) => {
            const isSelected = selectedIndex === i;
            const isCompare = compareIndex === i;
            const isCurrent = i === snapshots.length - 1;
            const time = new Date(snap.timestamp);
            const timeStr = time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <React.Fragment key={`snap-${snap.timestamp}-${i}`}>
                {/* Connector line */}
                {i > 0 && <div className="h-px w-3 shrink-0 bg-border/40" />}

                {/* Snapshot dot + label */}
                <button
                  type="button"
                  onClick={(e) => {
                    if (e.shiftKey) {
                      onCompare(i);
                    } else {
                      onSelect(i);
                    }
                  }}
                  className={cn(
                    "group flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 transition-all",
                    isSelected && "bg-primary/10",
                    isCompare && "bg-orange-500/10",
                    !isSelected && !isCompare && "hover:bg-muted/30",
                  )}
                  title={`${t("config.clickToView")}${snapshots.length > 1 ? ` · Shift+${t("config.clickToCompare")}` : ""}`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full transition-colors",
                        isSelected
                          ? "bg-primary"
                          : isCompare
                            ? "bg-orange-500"
                            : isCurrent
                              ? "bg-[var(--color-success)]"
                              : "bg-muted-foreground/30",
                      )}
                    />
                    {isCompare && <GitCompareArrows className="h-2.5 w-2.5 text-orange-500" />}
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground/60">{timeStr}</span>
                  {isCurrent && (
                    <span className="text-[8px] font-semibold uppercase text-[var(--color-success)]/70">
                      {t("config.latest")}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        {(selectedIndex !== null || compareIndex !== null) && (
          <p className="mt-1.5 text-[9px] text-muted-foreground/40">
            {compareIndex !== null ? t("config.comparingVersions") : t("config.viewingVersion")}
          </p>
        )}
      </div>
    );
  },
);

ConfigTimeline.displayName = "ConfigTimeline";
