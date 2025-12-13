"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchSwitcherProps {
  branch: string | undefined;
  branchOptions: string[] | undefined;
  onSelect: (branch: string) => void;
  className?: string;
}

export const BranchSwitcher = React.memo<BranchSwitcherProps>(
  ({ branch, branchOptions, onSelect, className }) => {
    // Use provided branchOptions directly - they should be calculated in useChat
    const effectiveBranchOptions = branchOptions || (branch ? [branch] : []);

    if (!branch || effectiveBranchOptions.length <= 1) {
      return null;
    }

    const currentIndex = effectiveBranchOptions.indexOf(branch);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === effectiveBranchOptions.length - 1;
    const handlePrev = () => {
      if (!isFirst) {
        const prevBranch = effectiveBranchOptions[currentIndex - 1];
        console.debug("BranchSwitcher: Switching to previous branch", {
          currentBranch: branch,
          prevBranch,
          allBranches: effectiveBranchOptions,
          currentIndex,
        });
        onSelect(prevBranch);
      }
    };

    const handleNext = () => {
      if (!isLast) {
        const nextBranch = effectiveBranchOptions[currentIndex + 1];
        console.debug("BranchSwitcher: Switching to next branch", {
          currentBranch: branch,
          nextBranch,
          allBranches: effectiveBranchOptions,
          currentIndex,
        });
        onSelect(nextBranch);
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
          {currentIndex + 1} / {effectiveBranchOptions.length}
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
