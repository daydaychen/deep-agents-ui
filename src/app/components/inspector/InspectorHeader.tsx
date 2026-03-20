"use client";

import { Database, Image, ScrollText, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { cn } from "@/lib/utils";
import { type InspectorTab, useInspector } from "./inspector-context";

const TABS: { key: InspectorTab; icon: React.ReactNode; shortcut: string }[] = [
  { key: "data", icon: <Database className="h-3.5 w-3.5" />, shortcut: "1" },
  { key: "config", icon: <Settings2 className="h-3.5 w-3.5" />, shortcut: "2" },
  { key: "log", icon: <ScrollText className="h-3.5 w-3.5" />, shortcut: "3" },
  { key: "screenshot", icon: <Image className="h-3.5 w-3.5" />, shortcut: "4" },
];

export const InspectorHeader = React.memo(() => {
  const { state, dispatch } = useInspector();
  const t = useTranslations("inspector");

  return (
    <div className="flex shrink-0 items-center border-b border-border/50 px-3 py-2">
      <div className="flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => dispatch({ type: "SET_TAB", payload: tab.key })}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              state.activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/60 hover:bg-muted/50 hover:text-muted-foreground",
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{t(`tabs.${tab.key}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

InspectorHeader.displayName = "InspectorHeader";
