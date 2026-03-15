"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Database, Copy, Download, Edit, Save, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { MemoryItem } from "@/app/types/types";
import useSWRMutation from "swr/mutation";
import { useTranslations } from "next-intl";
import type { StandaloneConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./MarkdownContent";

export const MemoryItemDialog = React.memo<{
  item: MemoryItem | null;
  onSaveItem: (
    namespace: string[],
    key: string,
    value: Record<string, unknown>
  ) => Promise<void>;
  onClose: () => void;
  editDisabled: boolean;
  config: StandaloneConfig;
  assistantName?: string;
}>(({ item, onSaveItem, onClose, editDisabled, config, assistantName }) => {
  const t = useTranslations("memory");
  const [isEditingMode, setIsEditingMode] = useState(item === null);

  // Split namespace into ID and Type
  const [namespaceId, setNamespaceId] = useState("");
  const [namespaceType, setNamespaceType] = useState<"memories" | "reports">(
    "memories"
  );
  const [itemKey, setItemKey] = useState(item?.key || "/");
  const [content, setContent] = useState("");

  const itemUpdate = useSWRMutation(
    {
      kind: "memory-item-update",
      namespaceId,
      namespaceType,
      itemKey,
      content,
    },
    async () => {
      if (!namespaceId || !namespaceType || !itemKey || !content) return;

      const now = new Date().toISOString();
      const contentArray = content
        .split("\n")
        .filter((line) => line.trim() !== "");

      const newValue: Record<string, unknown> = {
        content: contentArray,
        created_at: (item?.value as any)?.created_at || now,
        modified_at: now,
      };

      return await onSaveItem([namespaceId, namespaceType], itemKey, newValue);
    },
    {
      onSuccess: () => setIsEditingMode(false),
      onError: (error) =>
        toast.error(t("saveItemFailed", { error: String(error) })),
    }
  );

  useEffect(() => {
    if (item) {
      const ns = item.namespace;
      if (ns.length >= 2) {
        setNamespaceId(ns[0]);
        setNamespaceType((ns[1] as any) === "reports" ? "reports" : "memories");
      } else if (ns.length === 1) {
        setNamespaceId(ns[0]);
      }

      setItemKey(item.key);

      const val = item.value as any;
      if (val && Array.isArray(val.content)) {
        setContent(val.content.join("\n"));
      } else if (val && typeof val === "object") {
        setContent(JSON.stringify(val, null, 2));
      } else {
        setContent("");
      }
    } else {
      setNamespaceId(config.userId || config.assistantId || "");
      setNamespaceType("memories");
      setItemKey("/");
      setContent("");
    }
    setIsEditingMode(item === null);
  }, [item, config]);

  const handleCopy = useCallback(() => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success(t("copiedToClipboard"));
    }
  }, [content, t]);

  const handleDownload = useCallback(() => {
    if (content && itemKey) {
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${itemKey.replace(/^\//, "") || "memory"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [content, itemKey]);

  const handleEdit = useCallback(() => {
    setIsEditingMode(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (item === null) {
      onClose();
    } else {
      const ns = item.namespace;
      if (ns.length >= 2) {
        setNamespaceId(ns[0]);
        setNamespaceType((ns[1] as any) === "reports" ? "reports" : "memories");
      }
      setItemKey(item.key);
      const val = item.value as any;
      if (val && Array.isArray(val.content)) {
        setContent(val.content.join("\n"));
      }
      setIsEditingMode(false);
    }
  }, [item, onClose]);

  const isValid = useMemo(() => {
    return (
      namespaceId.trim() !== "" &&
      itemKey.startsWith("/") &&
      itemKey.length > 1 &&
      content.trim() !== ""
    );
  }, [namespaceId, itemKey, content]);

  const idOptions = useMemo(() => {
    const options = [];
    if (config.userId) {
      options.push({
        label: `${t("user")} (${config.userId})`,
        value: config.userId,
      });
    }
    if (config.assistantId) {
      options.push({
        label: `${t("assistant")} (${assistantName || config.assistantId})`,
        value: config.assistantId,
      });
    }
    return options;
  }, [config, t, assistantName]);

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
    >
      <DialogContent className="flex h-[80vh] max-h-[80vh] min-w-[60vw] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pb-2 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {item ? t("edit") : t("newItemTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="h-full flex-1">
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    {t("namespaceId")}
                  </label>
                  {isEditingMode ? (
                    <Select
                      value={namespaceId}
                      onValueChange={setNamespaceId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("selectId")} />
                      </SelectTrigger>
                      <SelectContent>
                        {idOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                      {namespaceId}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    {t("namespaceType")}
                  </label>
                  {isEditingMode ? (
                    <Select
                      value={namespaceType}
                      onValueChange={(val) =>
                        setNamespaceType(val as "memories" | "reports")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="memories">
                          {t("memories")}
                        </SelectItem>
                        <SelectItem value="reports">{t("reports")}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                      {t(namespaceType)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  {t("key")}
                </label>
                {isEditingMode ? (
                  <div className="space-y-1">
                    <Input
                      value={itemKey}
                      onChange={(e) => setItemKey(e.target.value)}
                      placeholder="/filename.md"
                      className={cn(
                        "text-sm",
                        !itemKey.startsWith("/") &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {!itemKey.startsWith("/") && (
                      <p className="text-[10px] text-destructive">
                        {t("invalidKey")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-sm">
                    {itemKey}
                  </div>
                )}
              </div>

              <div className="flex min-h-[300px] flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    {t("content")}
                  </label>
                  {!isEditingMode && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleEdit}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={editDisabled}
                      >
                        <Edit
                          size={14}
                          className="mr-1"
                        />
                        {t("edit")}
                      </Button>
                      <Button
                        onClick={handleCopy}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        <Copy
                          size={14}
                          className="mr-1"
                        />
                        {t("copy")}
                      </Button>
                      <Button
                        onClick={handleDownload}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        <Download
                          size={14}
                          className="mr-1"
                        />
                        {t("download")}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="min-h-[300px] flex-1">
                  {isEditingMode ? (
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t("contentPlaceholder")}
                      className="h-full min-h-[300px] resize-none font-mono text-sm"
                    />
                  ) : (
                    <div className="min-h-[200px] overflow-auto rounded-md border bg-muted/30 p-4">
                      {content ? (
                        <MarkdownContent content={content} />
                      ) : (
                        <div className="flex items-center justify-center p-12">
                          <p className="text-sm text-muted-foreground">
                            {t("itemEmpty")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {isEditingMode && (
          <div className="flex justify-end gap-2 border-t bg-muted/20 p-4">
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
              onClick={() => itemUpdate.trigger()}
              size="sm"
              disabled={itemUpdate.isMutating || !isValid}
            >
              {itemUpdate.isMutating ? (
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

MemoryItemDialog.displayName = "MemoryItemDialog";
