"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, GitFork } from "lucide-react";
import React from "react";

interface BranchSwitcherProps {
  branchOptions: string[] | undefined;
  currentIndex: number;
  onSelect: (branch: string) => void;
  className?: string;
  isLoading?: boolean;
}

export const BranchSwitcher = React.memo<BranchSwitcherProps>(
  ({ branchOptions, currentIndex, onSelect, className, isLoading = false }) => {
    const options = branchOptions || [];

    // If no branches at all, don't show anything
    if (options.length === 0) {
      return null;
    }

    const effectiveIndex = currentIndex >= 0 ? currentIndex : 0;
    const isFirst = effectiveIndex === 0;
    const isLast = effectiveIndex === options.length - 1;
    const hasMultiple = options.length > 1;

    return (
      <div
        className={cn(
          "flex items-center gap-1 px-1 py-0.5 rounded-full bg-accent/30 border border-accent/50 transition-all duration-200",
          className
        )}
      >
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <GitFork className="h-3 w-3 opacity-60" />
          <span>
            {effectiveIndex + 1} / {options.length}
          </span>
        </div>

        {hasMultiple && (
          <div className="flex items-center border-l border-accent/50 ml-0.5 pl-0.5 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!isFirst && !isLoading) {
                  onSelect(options[effectiveIndex - 1]);
                }
              }}
              disabled={isFirst || isLoading}
              className="h-6 w-6 rounded-full hover:bg-accent/60 transition-colors"
              title="Previous branch"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!isLast && !isLoading) {
                  onSelect(options[effectiveIndex + 1]);
                }
              }}
              disabled={isLast || isLoading}
              className="h-6 w-6 rounded-full hover:bg-accent/60 transition-colors"
              title="Next branch"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

BranchSwitcher.displayName = "BranchSwitcher";