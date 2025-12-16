"use client";

import type { ThreadItem } from "@/app/hooks/useThreads";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import React from "react";

export type StatusFilter = "all" | "idle" | "busy" | "interrupted" | "error";

const STATUS_COLORS: Record<ThreadItem["status"], string> = {
  idle: "bg-green-500",
  busy: "bg-blue-500",
  interrupted: "bg-orange-500",
  error: "bg-red-600",
};

function getThreadColor(status: ThreadItem["status"]): string {
  return STATUS_COLORS[status] ?? "bg-gray-400";
}

interface StatusFilterItemProps {
  status: ThreadItem["status"];
  label: string;
  badge?: number;
}

function StatusFilterItem({ status, label, badge }: StatusFilterItemProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-block size-2 rounded-full",
          getThreadColor(status)
        )}
      />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </span>
  );
}

interface ThreadStatusFilterProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  interruptedCount?: number;
}

export const ThreadStatusFilter = React.memo<ThreadStatusFilterProps>(
  ({ value, onChange, interruptedCount = 0 }) => {
    return (
      <Select
        value={value}
        onValueChange={(v) => onChange(v as StatusFilter)}
      >
        <SelectTrigger className="w-fit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">All statuses</SelectItem>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Active</SelectLabel>
            <SelectItem value="idle">
              <StatusFilterItem
                status="idle"
                label="Idle"
              />
            </SelectItem>
            <SelectItem value="busy">
              <StatusFilterItem
                status="busy"
                label="Busy"
              />
            </SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Attention</SelectLabel>
            <SelectItem value="interrupted">
              <StatusFilterItem
                status="interrupted"
                label="Interrupted"
                badge={interruptedCount}
              />
            </SelectItem>
            <SelectItem value="error">
              <StatusFilterItem
                status="error"
                label="Error"
              />
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
);

ThreadStatusFilter.displayName = "ThreadStatusFilter";
