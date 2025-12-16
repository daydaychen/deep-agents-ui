"use client";

import type { TodoItem } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, Clock } from "lucide-react";
import React from "react";

interface TaskProgressButtonProps {
  todos: TodoItem[];
  groupedTodos: {
    pending: TodoItem[];
    in_progress: TodoItem[];
    completed: TodoItem[];
  };
  onClick: () => void;
  isExpanded: boolean;
}

const getStatusIcon = (status: TodoItem["status"], className?: string) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle
          size={16}
          className={cn("text-success/80", className)}
        />
      );
    case "in_progress":
      return (
        <Clock
          size={16}
          className={cn("text-warning/80", className)}
        />
      );
    default:
      return (
        <Circle
          size={16}
          className={cn("text-tertiary/70", className)}
        />
      );
  }
};

export const TaskProgressButton = React.memo<TaskProgressButtonProps>(
  ({ todos, groupedTodos, onClick, isExpanded }) => {
    const activeTask = todos.find((t) => t.status === "in_progress");
    const totalTasks = todos.length;
    const remainingTasks = totalTasks - groupedTodos.pending.length;
    const isCompleted = totalTasks === remainingTasks;

    return (
      <button
        type="button"
        onClick={onClick}
        className="grid w-full cursor-pointer grid-cols-[auto_auto_1fr] items-center gap-3 px-[18px] py-3 text-left"
        aria-expanded={isExpanded}
      >
        {(() => {
          if (isCompleted) {
            return [
              <CheckCircle
                key="icon"
                size={16}
                className="text-success/80"
              />,
              <span
                key="label"
                className="ml-[1px] min-w-0 truncate text-sm"
              >
                All tasks completed
              </span>,
            ];
          }

          if (activeTask != null) {
            return [
              <div key="icon">{getStatusIcon(activeTask.status)}</div>,
              <span
                key="label"
                className="ml-[1px] min-w-0 truncate text-sm"
              >
                Task {totalTasks - groupedTodos.pending.length} of {totalTasks}
              </span>,
              <span
                key="content"
                className="min-w-0 gap-2 truncate text-sm text-muted-foreground"
              >
                {activeTask.content}
              </span>,
            ];
          }

          return [
            <Circle
              key="icon"
              size={16}
              className="text-tertiary/70"
            />,
            <span
              key="label"
              className="ml-[1px] min-w-0 truncate text-sm"
            >
              Task {totalTasks - groupedTodos.pending.length} of {totalTasks}
            </span>,
          ];
        })()}
      </button>
    );
  }
);

TaskProgressButton.displayName = "TaskProgressButton";
