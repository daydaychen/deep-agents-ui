"use client";

import { Copy, Download, Edit, FileText, Loader2, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import type { FileItem } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  json: "json",
  xml: "xml",
  html: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  dockerfile: "dockerfile",
  makefile: "makefile",
};

export const FileViewDialog = React.memo<{
  file: FileItem | null;
  onSaveFile: (fileName: string, content: string) => Promise<void>;
  onClose: () => void;
  editDisabled: boolean;
}>(({ file, onSaveFile, onClose, editDisabled }) => {
  const t = useTranslations("common");
  const [isEditingMode, setIsEditingMode] = useState(file === null);
  const [fileName, setFileName] = useState(String(file?.path || ""));
  const [fileContent, setFileContent] = useState(String(file?.content || ""));
  const [isReady, setIsReady] = useState(false);

  // Large file threshold (100KB)
  const isVeryLargeFile = useMemo(() => {
    return fileContent.length > 100 * 1024;
  }, [fileContent]);

  const fileUpdate = useSWRMutation(
    { kind: "files-update", fileName, fileContent },
    async ({ fileName, fileContent }) => {
      if (!fileName || !fileContent) return;
      return await onSaveFile(fileName, fileContent);
    },
    {
      onSuccess: () => setIsEditingMode(false),
      onError: (error) => toast.error(`${t("error")}: ${String(error)}`),
    },
  );

  // Derived values to avoid subscribing to entire file object
  const hasFile = !!file;
  const filePath = file?.path ?? "";
  const fileContentValue = file?.content ?? "";

  useEffect(() => {
    setFileName(String(filePath));
    setFileContent(String(fileContentValue));
    setIsEditingMode(!hasFile);
    // Reset ready state when file changes
    setIsReady(false);

    // Delay rendering of syntax highlighter to ensure dialog opens smoothly
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [hasFile, filePath, fileContentValue]);

  const fileExtension = useMemo(() => {
    const fileNameStr = String(fileName || "");
    return fileNameStr.split(".").pop()?.toLowerCase() || "";
  }, [fileName]);

  const isMarkdown = fileExtension === "md" || fileExtension === "markdown";

  const language = useMemo(() => {
    return LANGUAGE_MAP[fileExtension] || "text";
  }, [fileExtension]);

  const handleCopy = useCallback(() => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent);
    }
  }, [fileContent]);

  const handleDownload = useCallback(() => {
    if (fileContent && fileName) {
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [fileContent, fileName]);

  const handleEdit = useCallback(() => {
    setIsEditingMode(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (file === null) {
      onClose();
    } else {
      setFileName(String(file.path));
      setFileContent(String(file.content));
      setIsEditingMode(false);
    }
  }, [file, onClose]);

  const fileNameIsValid = useMemo(() => {
    return fileName.trim() !== "" && !fileName.includes("/") && !fileName.includes(" ");
  }, [fileName]);

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
    >
      <DialogContent className="flex h-[80vh] max-h-[80vh] min-w-[60vw] flex-col p-6 shadow-2xl">
        <DialogTitle className="sr-only">{file?.path || t("new")}</DialogTitle>
        <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg text-primary">
              <FileText className="h-4 w-4 shrink-0" />
            </div>
            {isEditingMode && file === null ? (
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={t("new")}
                className="text-base font-medium"
                aria-invalid={!fileNameIsValid}
              />
            ) : (
              <div className="flex flex-col">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-medium text-foreground">
                  {file?.path}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {fileContent.length} {t("characters")}
                </span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!isEditingMode && (
              <>
                <Button
                  onClick={handleEdit}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={editDisabled}
                >
                  <Edit
                    size={14}
                    className="mr-1.5"
                  />
                  {t("edit")}
                </Button>
                <div className="mx-1 h-4 w-px bg-border/60" />
                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                >
                  <Copy
                    size={14}
                    className="mr-1.5"
                  />
                  {t("copy")}
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                >
                  <Download
                    size={14}
                    className="mr-1.5"
                  />
                  {t("download")}
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {isEditingMode ? (
            <Textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder={t("new")}
              className="h-full min-h-[400px] resize-none border-none bg-muted/20 font-mono text-sm focus-visible:ring-0"
            />
          ) : (
            <ScrollArea className="h-full rounded-xl border border-border/50 bg-muted/10">
              <div className="min-h-full p-6">
                {fileContent ? (
                  !isReady ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground/40">
                      <div className="animate-spin">
                        <Loader2 className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-widest">
                        {t("loading")}
                      </span>
                    </div>
                  ) : isMarkdown ? (
                    <div className="rounded-md">
                      <MarkdownContent content={fileContent} />
                    </div>
                  ) : isVeryLargeFile ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                        <span className="font-bold">⚠️ Large File Detected:</span>
                        <span>Syntax highlighting disabled for better performance.</span>
                      </div>
                      <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-[#1e1e1e] p-4 font-mono text-xs leading-relaxed text-zinc-300 shadow-inner">
                        <code>{fileContent}</code>
                      </pre>
                    </div>
                  ) : (
                    <SyntaxHighlighter
                      language={language}
                      style={oneDark}
                      customStyle={{
                        margin: 0,
                        padding: "1.5rem",
                        borderRadius: "0.75rem",
                        fontSize: "0.8125rem",
                        lineHeight: "1.6",
                        backgroundColor: "#1e1e1e",
                      }}
                      showLineNumbers
                      wrapLines={false} // Faster for large-ish files
                    >
                      {fileContent}
                    </SyntaxHighlighter>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <FileText
                      size={40}
                      className="mb-4 text-muted-foreground/20"
                    />
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {t("empty")}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
        {isEditingMode && (
          <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
            >
              <X
                size={16}
                className="mr-1"
              />
              {t("cancel")}
            </Button>
            <Button
              onClick={() => fileUpdate.trigger()}
              size="sm"
              disabled={
                fileUpdate.isMutating || !fileName.trim() || !fileContent.trim() || !fileNameIsValid
              }
            >
              {fileUpdate.isMutating ? (
                <div className="mr-1 animate-spin">
                  <Loader2 size={16} />
                </div>
              ) : (
                <Save
                  size={16}
                  className="mr-1"
                />
              )}
              {t("save")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

FileViewDialog.displayName = "FileViewDialog";
