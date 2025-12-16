"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

interface BranchSwitcherProps {
  branchOptions: string[] | undefined;
  currentIndex: number;
  onSelect: (branch: string) => void;
  className?: string;
}

export const BranchSwitcher = React.memo<BranchSwitcherProps>(
  ({ branchOptions, currentIndex, onSelect, className }) => {
    const options = branchOptions || [];

    if (options.length <= 1) {
      return null;
    }

    const effectiveIndex = currentIndex >= 0 ? currentIndex : 0;
    const isFirst = effectiveIndex === 0;
    const isLast = effectiveIndex === options.length - 1;

    const handlePrev = () => {
      if (!isFirst && effectiveIndex > 0) {
        onSelect(options[effectiveIndex - 1]);
      }
    };

    const handleNext = () => {
      if (!isLast && effectiveIndex < options.length - 1) {
        onSelect(options[effectiveIndex + 1]);
      }
    };

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={isFirst}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span className="text-xs text-muted-foreground">
          {effectiveIndex + 1} / {options.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={isLast}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }
);

BranchSwitcher.displayName = "BranchSwitcher";
