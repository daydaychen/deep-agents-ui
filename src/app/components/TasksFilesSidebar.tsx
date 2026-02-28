"use client";

import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  LayoutList,
  FolderTree,
  ExternalLink,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TodoItem, FileItem } from "@/app/types/types";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { FileViewDialog } from "@/app/components/FileViewDialog";

export function FilesPopover({
  files,
  setFiles,
  editDisabled,
}: {
  files: Record<string, string>;
  setFiles: (files: Record<string, string>) => Promise<void>;
  editDisabled: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const handleSaveFile = useCallback(
    async (fileName: string, content: string) => {
      await setFiles({ ...files, [fileName]: content });
      setSelectedFile({ path: fileName, content: content });
    },
    [files, setFiles]
  );

  return (
    <>
      {Object.keys(files).length === 0 ? (
        <div className="flex flex-col h-full items-center justify-center p-6 text-center opacity-50">
          <FolderTree size={24} className="mb-2 text-muted-foreground/30" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">No files created</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 p-1">
          {Object.keys(files).map((file) => {
            const filePath = String(file);
            const rawContent = files[file];
            let fileContent: string;
            if (
              typeof rawContent === "object" &&
              rawContent !== null &&
              "content" in rawContent
            ) {
              const contentArray = (rawContent as { content: unknown }).content;
              if (Array.isArray(contentArray)) {
                fileContent = contentArray.join("\n");
              } else {
                fileContent = String(contentArray || "");
              }
            } else {
              fileContent = String(rawContent || "");
            }

            return (
              <button
                key={filePath}
                type="button"
                onClick={() =>
                  setSelectedFile({ path: filePath, content: fileContent })
                }
                className="group flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-left transition-[background-color,border-color,color,transform] hover:border-border hover:bg-muted/50 active:scale-[0.98]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {filePath}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {fileContent.length} characters
                  </div>
                </div>
                <ExternalLink size={12} className="text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-[color,opacity]" />
              </button>
            );
          })}
        </div>
      )}

      {selectedFile && (
        <FileViewDialog
          file={selectedFile}
          onSaveFile={handleSaveFile}
          onClose={() => setSelectedFile(null)}
          editDisabled={editDisabled}
        />
      )}
    </>
  );
}

export const TasksFilesSidebar = React.memo<{
  todos: TodoItem[];
  files: Record<string, string>;
  setFiles: (files: Record<string, string>) => Promise<void>;
}>(({ todos, files, setFiles }) => {
  const { isLoading, interrupt } = useChatContext();
  const [tasksOpen, setTasksOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);

  // Track previous counts to detect when content goes from empty to having items
  const prevTodosCount = useRef(todos.length);
  const prevFilesCount = useRef(Object.keys(files).length);

  // Auto-expand when todos go from empty to having content
  useEffect(() => {
    if (prevTodosCount.current === 0 && todos.length > 0) {
      setTasksOpen(true);
    }
    prevTodosCount.current = todos.length;
  }, [todos.length]);

  // Auto-expand when files go from empty to having content
  const filesCount = Object.keys(files).length;
  useEffect(() => {
    if (prevFilesCount.current === 0 && filesCount > 0) {
      setFilesOpen(true);
    }
    prevFilesCount.current = filesCount;
  }, [filesCount]);

  const getStatusIcon = useCallback((status: TodoItem["status"]) => {
    switch (status) {
      case "completed":
        return (
          <CheckCircle2
            size={14}
            className="text-emerald-500 mt-0.5 shrink-0"
          />
        );
      case "in_progress":
        return (
          <Clock
            size={14}
            className="text-amber-500 mt-0.5 shrink-0 animate-pulse"
          />
        );
      default:
        return (
          <Circle
            size={14}
            className="text-muted-foreground/40 mt-0.5 shrink-0"
          />
        );
    }
  }, []);

  const groupedTodos = useMemo(() => {
    return {
      in_progress: todos.filter((t) => t.status === "in_progress"),
      pending: todos.filter((t) => t.status === "pending"),
      completed: todos.filter((t) => t.status === "completed"),
    };
  }, [todos]);

  const groupedLabels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <div className="flex h-full w-full flex-col min-h-0">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Tasks Section */}
        <div className="flex flex-col min-h-0 max-h-[60%] border-b border-border/40">
          <button
            onClick={() => setTasksOpen((v) => !v)}
            className="group flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LayoutList size={16} className={cn("transition-colors", tasksOpen ? "text-primary" : "text-muted-foreground")} />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/80">
                Agent Tasks
              </span>
              {todos.length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muted px-1 text-[9px] font-bold">
                  {todos.length}
                </span>
              )}
            </div>
            <ChevronDown 
              size={14} 
              className={cn("text-muted-foreground transition-transform duration-300", tasksOpen ? "rotate-0" : "-rotate-90 opacity-40")} 
            />
          </button>
          
          {tasksOpen && (
            <ScrollArea className="flex-1 px-3">
              {todos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                  <LayoutList size={20} className="mb-2 text-muted-foreground/30" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">No tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {Object.entries(groupedTodos).map(([status, groupTodos]) => (
                    groupTodos.length > 0 && (
                      <div key={status} className="space-y-1.5">
                        <h3 className="flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {groupedLabels[status as keyof typeof groupedLabels]}
                        </h3>
                        {groupTodos.map((todo, index) => (
                          <div
                            key={`${status}_${todo.id}_${index}`}
                            className={cn(
                              "group flex items-start gap-2.5 rounded-lg p-2 text-xs transition-colors hover:bg-muted/40",
                              todo.status === "completed" && "opacity-60"
                            )}
                          >
                            {getStatusIcon(todo.status)}
                            <span className={cn(
                              "flex-1 leading-relaxed break-words",
                              todo.status === "completed" && "line-through decoration-muted-foreground/30"
                            )}>
                              {todo.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* Files Section */}
        <div className="flex flex-col flex-1 min-h-0">
          <button
            onClick={() => setFilesOpen((v) => !v)}
            className="group flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderTree size={16} className={cn("transition-colors", filesOpen ? "text-primary" : "text-muted-foreground")} />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/80">
                File System
              </span>
              {Object.keys(files).length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muted px-1 text-[9px] font-bold">
                  {Object.keys(files).length}
                </span>
              )}
            </div>
            <ChevronDown 
              size={14} 
              className={cn("text-muted-foreground transition-transform duration-300", filesOpen ? "rotate-0" : "-rotate-90 opacity-40")} 
            />
          </button>
          
          {filesOpen && (
            <ScrollArea className="flex-1 px-3">
              <div className="pb-4">
                <FilesPopover
                  files={files}
                  setFiles={setFiles}
                  editDisabled={isLoading === true || interrupt !== undefined}
                />
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
});

TasksFilesSidebar.displayName = "TasksFilesSidebar";
