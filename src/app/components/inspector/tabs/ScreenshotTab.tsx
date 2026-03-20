"use client";

import { ChevronLeft, ChevronRight, Image } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useInspector } from "../inspector-context";

export const ScreenshotTab = React.memo(() => {
  const { state } = useInspector();
  const t = useTranslations("inspector");
  const [currentIndex, setCurrentIndex] = useState(0);

  if (state.screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <Image
          size={32}
          className="mb-4 text-muted-foreground/20"
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">
          {t("screenshot.noScreenshots")}
        </p>
      </div>
    );
  }

  const current = state.screenshots[currentIndex];
  const hasMultiple = state.screenshots.length > 1;

  // Determine if data is base64 or URL
  const imgSrc =
    current.data.startsWith("data:") || current.data.startsWith("http")
      ? current.data
      : `data:image/png;base64,${current.data}`;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Navigation */}
      {hasMultiple && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {state.screenshots.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentIndex === state.screenshots.length - 1}
            onClick={() => setCurrentIndex((i) => i + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Screenshot */}
      <div className="overflow-hidden rounded-lg border border-border/40">
        <img
          src={imgSrc}
          alt={current.label || "Screenshot"}
          className="h-auto w-full object-contain"
        />
      </div>

      {current.label && (
        <p className="text-center text-xs text-muted-foreground/60">{current.label}</p>
      )}
    </div>
  );
});

ScreenshotTab.displayName = "ScreenshotTab";
