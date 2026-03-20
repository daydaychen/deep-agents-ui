"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InspectorHeader } from "./InspectorHeader";
import { useInspector } from "./inspector-context";
import { ConfigTab } from "./tabs/ConfigTab";
import { DataTab } from "./tabs/DataTab";
import { LogTab } from "./tabs/LogTab";
import { ScreenshotTab } from "./tabs/ScreenshotTab";

export const InspectorPanel = React.memo(() => {
  const { state } = useInspector();
  const { activeTab } = state;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <InspectorHeader />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          {activeTab === "data" && <DataTab />}
          {activeTab === "config" && <ConfigTab />}
          {activeTab === "log" && <LogTab />}
          {activeTab === "screenshot" && <ScreenshotTab />}
        </ScrollArea>
      </div>
    </div>
  );
});

InspectorPanel.displayName = "InspectorPanel";
