"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Database, Copy, Download, Edit, Save, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { MemoryItem } from "@/app/types/types";
import useSWRMutation from "swr/mutation";

export const MemoryItemDialog = React.memo<{
  item: MemoryItem | null;
  onSaveItem: (
    namespace: string[],
    key: string,
    value: Record<string, unknown>
  ) => Promise<void>;
  onClose: () => void;
  editDisabled: boolean;
}>(({ item, onSaveItem, onClose, editDisabled }) => {
  const [isEditingMode, setIsEditingMode] = useState(item === null);
  const [namespace, setNamespace] = useState(item?.namespace.join(".") || "");
  const [itemKey, setItemKey] = useState(item?.key || "");
  const [itemValue, setItemValue] = useState(
    JSON.stringify(item?.value || {}, null, 2)
  );

  const itemUpdate = useSWRMutation(
    { kind: "memory-item-update", namespace, itemKey, itemValue },
    async ({ namespace, itemKey, itemValue }) => {
      if (!namespace || !itemKey || !itemValue) return;
      const namespaceArray = namespace.split(".").filter(Boolean);
      const parsedValue = JSON.parse(itemValue);
      return await onSaveItem(namespaceArray, itemKey, parsedValue);
    },
    {
      onSuccess: () => setIsEditingMode(false),
      onError: (error) => toast.error(`保存项目失败: ${error}`),
    }
  );

  useEffect(() => {
    setNamespace(item?.namespace.join(".") || "");
    setItemKey(item?.key || "");
    setItemValue(JSON.stringify(item?.value || {}, null, 2));
    setIsEditingMode(item === null);
  }, [item]);

  const handleCopy = useCallback(() => {
    if (itemValue) {
      navigator.clipboard.writeText(itemValue);
      toast.success("已复制到剪贴板");
    }
  }, [itemValue]);

  const handleDownload = useCallback(() => {
    if (itemValue && itemKey) {
      const blob = new Blob([itemValue], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${itemKey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [itemValue, itemKey]);

  const handleEdit = useCallback(() => {
    setIsEditingMode(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (item === null) {
      onClose();
    } else {
      setNamespace(item.namespace.join("."));
      setItemKey(item.key);
      setItemValue(JSON.stringify(item.value, null, 2));
      setIsEditingMode(false);
    }
  }, [item, onClose]);

  const isValid = useMemo(() => {
    if (!namespace.trim() || !itemKey.trim() || !itemValue.trim()) {
      return false;
    }
    try {
      JSON.parse(itemValue);
      return true;
    } catch {
      return false;
    }
  }, [namespace, itemKey, itemValue]);

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
    >
      <DialogContent className="flex h-[80vh] max-h-[80vh] min-w-[60vw] flex-col p-6">
        <DialogTitle className="sr-only">
          {item ? `${item.namespace.join(".")}.${item.key}` : "新建项目"}
        </DialogTitle>
        <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Database className="text-primary/50 h-5 w-5 shrink-0" />
            {isEditingMode ? (
              <div className="flex flex-1 gap-2">
                <Input
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                  placeholder="命名空间 (例如: user.preferences)"
                  className="flex-1 text-sm"
                  aria-invalid={!namespace.trim()}
                />
                <Input
                  value={itemKey}
                  onChange={(e) => setItemKey(e.target.value)}
                  placeholder="键名"
                  className="flex-1 text-sm"
                  aria-invalid={!itemKey.trim()}
                />
              </div>
            ) : (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-medium text-primary">
                {item?.namespace.join(".")}.{item?.key}
              </span>
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
                    size={16}
                    className="mr-1"
                  />
                  编辑
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                >
                  <Copy
                    size={16}
                    className="mr-1"
                  />
                  复制
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                >
                  <Download
                    size={16}
                    className="mr-1"
                  />
                  下载
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {isEditingMode ? (
            <Textarea
              value={itemValue}
              onChange={(e) => setItemValue(e.target.value)}
              placeholder='输入 JSON 值 (例如: {"key": "value"})'
              className="h-full min-h-[400px] resize-none font-mono text-sm"
            />
          ) : (
            <ScrollArea className="bg-surface h-full rounded-md">
              <div className="p-4">
                {itemValue ? (
                  <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-zinc-100">
                    {itemValue}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center p-12">
                    <p className="text-sm text-muted-foreground">项目为空</p>
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
              取消
            </Button>
            <Button
              onClick={() => itemUpdate.trigger()}
              size="sm"
              disabled={itemUpdate.isMutating || !isValid}
            >
              {itemUpdate.isMutating ? (
                <Loader2
                  size={16}
                  className="mr-1 animate-spin"
                />
              ) : (
                <Save
                  size={16}
                  className="mr-1"
                />
              )}
              保存
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

MemoryItemDialog.displayName = "MemoryItemDialog";
