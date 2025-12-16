"use client";

import { CheckCircle, Circle, Clock, FileIcon } from "lucide-react";
import React, { Fragment, useRef } from "react";
import type { TodoItem } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { FilesPopover } from "@/app/components/TasksFilesSidebar";
import { TaskProgressButton } from "./TaskProgressButton";

interface TasksSectionProps {
  todos: TodoItem[];
  files: Record<string, string>;
  setFiles: (files: Record<string, string>) => Promise<void>;
  isLoading: boolean;
  interrupt: any;
  metaOpen: "tasks" | "files" | null;
  setMetaOpen: React.Dispatch<React.SetStateAction<"tasks" | "files" | null>>;
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

export const TasksSection = React.memo<TasksSectionProps>(
  ({ todos, files, setFiles, isLoading, interrupt, metaOpen, setMetaOpen }) => {
    const tasksContainerRef = useRef<HTMLDivElement | null>(null);

    const groupedTodos = {
      in_progress: todos.filter((t) => t.status === "in_progress"),
      pending: todos.filter((t) => t.status === "pending"),
      completed: todos.filter((t) => t.status === "completed"),
    };

    const hasTasks = todos.length > 0;
    const hasFiles = Object.keys(files).length > 0;

    if (!hasTasks && !hasFiles) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex flex-col overflow-y-auto border-b border-border bg-sidebar transition-all duration-300 ease-in-out",
          hasTasks || hasFiles ? "max-h-72" : "max-h-0 border-b-0"
        )}
      >
        {!metaOpen && (
          <>
            {(() => {
              const tasksTrigger = hasTasks ? (
                <TaskProgressButton
                  todos={todos}
                  groupedTodos={groupedTodos}
                  onClick={() =>
                    setMetaOpen((prev) => (prev === "tasks" ? null : "tasks"))
                  }
                  isExpanded={metaOpen === "tasks"}
                />
              ) : null;

              const filesTrigger = hasFiles ? (
                <button
                  type="button"
                  onClick={() =>
                    setMetaOpen((prev) => (prev === "files" ? null : "files"))
                  }
                  className="flex flex-shrink-0 cursor-pointer items-center gap-2 px-[18px] py-3 text-left text-sm"
                  aria-expanded={metaOpen === "files"}
                >
                  <FileIcon size={16} />
                  Files (State)
                  <span className="text-primary-foreground h-4 min-w-4 rounded-full bg-primary px-0.5 text-center text-[10px] leading-[16px]">
                    {Object.keys(files).length}
                  </span>
                </button>
              ) : null;

              return (
                <div className="grid grid-cols-[1fr_auto_auto] items-center">
                  {tasksTrigger}
                  {filesTrigger}
                </div>
              );
            })()}
          </>
        )}

        {metaOpen && (
          <>
            <div className="sticky top-0 flex items-stretch bg-sidebar text-sm">
              {hasTasks && (
                <button
                  type="button"
                  className="py-3 pr-4 first:pl-[18px] aria-expanded:font-semibold"
                  onClick={() =>
                    setMetaOpen((prev) => (prev === "tasks" ? null : "tasks"))
                  }
                  aria-expanded={metaOpen === "tasks"}
                >
                  Tasks
                </button>
              )}
              {hasFiles && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 py-3 pr-4 first:pl-[18px] aria-expanded:font-semibold"
                  onClick={() =>
                    setMetaOpen((prev) => (prev === "files" ? null : "files"))
                  }
                  aria-expanded={metaOpen === "files"}
                >
                  Files (State)
                  <span className="text-primary-foreground h-4 min-w-4 rounded-full bg-primary px-0.5 text-center text-[10px] leading-[16px]">
                    {Object.keys(files).length}
                  </span>
                </button>
              )}
              <button
                aria-label="Close"
                className="flex-1"
                onClick={() => setMetaOpen(null)}
              />
            </div>
            <div
              ref={tasksContainerRef}
              className="px-[18px]"
            >
              {metaOpen === "tasks" &&
                Object.entries(groupedTodos)
                  .filter(([_, todos]) => todos.length > 0)
                  .map(([status, todos]) => (
                    <div
                      key={status}
                      className="mb-4"
                    >
                      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                        {
                          {
                            pending: "Pending",
                            in_progress: "In Progress",
                            completed: "Completed",
                          }[status]
                        }
                      </h3>
                      <div className="grid grid-cols-[auto_1fr] gap-3 rounded-sm p-1 pl-0 text-sm">
                        {todos.map((todo, index) => (
                          <Fragment key={`${status}_${todo.id}_${index}`}>
                            {getStatusIcon(todo.status, "mt-0.5")}
                            <span className="break-words text-inherit">
                              {todo.content}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  ))}

              {metaOpen === "files" && (
                <div className="mb-6">
                  <FilesPopover
                    files={files}
                    setFiles={setFiles}
                    editDisabled={isLoading === true || interrupt !== undefined}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);

TasksSection.displayName = "TasksSection";
