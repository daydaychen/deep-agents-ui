"use client";

import { ChevronLeft, ChevronRight, Download, Image, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useInspector } from "../inspector-context";

export const ScreenshotTab = React.memo(() => {
  const { state } = useInspector();
  const t = useTranslations("inspector");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const hasMultiple = state.screenshots.length > 1;

  // Close zoom on Escape
  useEffect(() => {
    if (!zoomed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomed]);

  const handleDownload = useCallback(() => {
    if (state.screenshots.length === 0) return;
    const current = state.screenshots[currentIndex];
    const imgSrc =
      current.data.startsWith("data:") || current.data.startsWith("http")
        ? current.data
        : `data:image/png;base64,${current.data}`;
    const a = document.createElement("a");
    a.href = imgSrc;
    a.download = current.label || `screenshot-${currentIndex + 1}.png`;
    a.click();
  }, [state.screenshots, currentIndex]);

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
  const imgSrc =
    current.data.startsWith("data:") || current.data.startsWith("http")
      ? current.data
      : `data:image/png;base64,${current.data}`;

  return (
    <>
      <div className="flex flex-col gap-3 p-4">
        {/* Navigation + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {hasMultiple && (
              <>
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
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoomed(true)}
              title={t("screenshot.zoom")}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDownload}
              title={t("screenshot.download")}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Screenshot thumbnail */}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="cursor-zoom-in overflow-hidden rounded-lg border border-border/40 transition-opacity hover:opacity-90"
        >
          <img
            src={imgSrc}
            alt={current.label || "Screenshot"}
            className="h-auto w-full object-contain"
          />
        </button>

        {/* Label + timestamp */}
        {current.label && (
          <p className="text-center text-xs text-muted-foreground/60">{current.label}</p>
        )}
        <p className="text-center text-[10px] text-muted-foreground/30">
          {new Date(current.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {/* Zoom overlay */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setZoomed(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot zoom"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Navigation in zoom */}
          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => i - 1);
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white"
                disabled={currentIndex === state.screenshots.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => i + 1);
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by parent dialog */}
          <img
            src={imgSrc}
            alt={current.label || "Screenshot"}
            className="max-h-[90vh] max-w-[90vw] cursor-zoom-out rounded-lg object-contain shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
          />
        </div>
      )}
    </>
  );
});

ScreenshotTab.displayName = "ScreenshotTab";
