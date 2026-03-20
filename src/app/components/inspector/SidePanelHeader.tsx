"use client";

import { Search, Terminal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SidePanelView = "agent" | "inspector";

interface SidePanelHeaderProps {
  activeView: SidePanelView;
  onSetView: (view: SidePanelView) => void;
  onClose: () => void;
  agentBadge: boolean;
  inspectorBadge: boolean;
}

const TABS: { key: SidePanelView; icon: React.ReactNode }[] = [
  { key: "agent", icon: <Terminal className="h-3.5 w-3.5" /> },
  { key: "inspector", icon: <Search className="h-3.5 w-3.5" /> },
];

export const SidePanelHeader = React.memo<SidePanelHeaderProps>(
  ({ activeView, onSetView, onClose, agentBadge, inspectorBadge }) => {
    const t = useTranslations("inspector.sidePanel");

    const badges: Record<SidePanelView, boolean> = {
      agent: agentBadge,
      inspector: inspectorBadge,
    };

    return (
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => onSetView(tab.key)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                activeView === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:bg-muted/50 hover:text-muted-foreground",
              )}
            >
              {tab.icon}
              <span>{t(tab.key === "agent" ? "agentTrace" : "inspector")}</span>
              {badges[tab.key] && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 shrink-0 rounded-full hover:bg-muted"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  },
);

SidePanelHeader.displayName = "SidePanelHeader";
