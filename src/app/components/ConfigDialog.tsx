"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StandaloneConfig } from "@/lib/config";
import { Client } from "@langchain/langgraph-sdk";
import type { Assistant } from "@langchain/langgraph-sdk";
import { toast } from "sonner";
import { Loader2, Settings2, Globe, Key, ListFilter, Hash, User } from "lucide-react";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StandaloneConfig) => void;
  initialConfig?: StandaloneConfig;
  currentDeploymentUrl?: string;
  currentApiKey?: string;
}

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
  initialConfig,
  currentDeploymentUrl,
  currentApiKey,
}: ConfigDialogProps) {
  const [deploymentUrl, setDeploymentUrl] = useState(
    initialConfig?.deploymentUrl || ""
  );
  const [assistantId, setAssistantId] = useState(
    initialConfig?.assistantId || ""
  );
  const [langsmithApiKey, setLangsmithApiKey] = useState(
    initialConfig?.langsmithApiKey || ""
  );
  const [recursionLimit, setRecursionLimit] = useState(
    initialConfig?.recursionLimit?.toString() || "100"
  );
  const [userId, setUserId] = useState(initialConfig?.userId || "");
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [useCustomId, setUseCustomId] = useState(false);

  useEffect(() => {
    if (open && initialConfig) {
      setDeploymentUrl(initialConfig.deploymentUrl);
      setAssistantId(initialConfig.assistantId);
      setLangsmithApiKey(initialConfig.langsmithApiKey || "");
      setRecursionLimit(initialConfig.recursionLimit?.toString() || "100");
      setUserId(initialConfig.userId || "");
    }
  }, [open, initialConfig]);

  // Fetch assistants when deployment URL is available
  useEffect(() => {
    const fetchAssistants = async () => {
      const urlToUse = deploymentUrl || currentDeploymentUrl;
      const apiKeyToUse = langsmithApiKey || currentApiKey;

      if (!urlToUse || !open) {
        return;
      }

      setLoadingAssistants(true);
      try {
        const client = new Client({
          apiUrl: urlToUse,
          defaultHeaders: apiKeyToUse ? { "X-Api-Key": apiKeyToUse } : {},
        });

        const assistantsList = await client.assistants.search({
          limit: 100,
        });

        setAssistants(assistantsList);
      } catch (error) {
        console.error("Failed to fetch assistants:", error);
        setAssistants([]);
      } finally {
        setLoadingAssistants(false);
      }
    };

    fetchAssistants();
  }, [
    deploymentUrl,
    currentDeploymentUrl,
    langsmithApiKey,
    currentApiKey,
    open,
  ]);

  const handleSave = () => {
    if (!deploymentUrl) {
      toast.error("Deployment URL is required");
      return;
    }
    if (!assistantId) {
      toast.error("Assistant ID is required");
      return;
    }

    const parsedRecursionLimit = parseInt(recursionLimit, 10);
    if (isNaN(parsedRecursionLimit) || parsedRecursionLimit < 1) {
      toast.error("Recursion limit must be a positive number");
      return;
    }

    onSave({
      deploymentUrl,
      assistantId,
      langsmithApiKey: langsmithApiKey || undefined,
      recursionLimit: parsedRecursionLimit,
      userId: userId || undefined,
    });
    toast.success("Settings saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <DialogTitle>Configuration</DialogTitle>
          </div>
          <DialogDescription>
            Configure your LangGraph deployment settings. These settings are
            saved in your browser's local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="deploymentUrl" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Deployment URL
            </Label>
            <Input
              id="deploymentUrl"
              placeholder="https://<deployment-url>"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
              className="bg-muted/30"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="assistantId" className="flex items-center gap-1.5">
                <ListFilter className="h-3.5 w-3.5" />
                Assistant ID
              </Label>
              {assistants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseCustomId(!useCustomId)}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {useCustomId ? "Select from list" : "Enter manually"}
                </button>
              )}
            </div>
            {!useCustomId && assistants.length > 0 ? (
              <Select
                value={assistantId}
                onValueChange={setAssistantId}
                disabled={loadingAssistants}
              >
                <SelectTrigger id="assistantId" className="bg-muted/30">
                  <SelectValue
                    placeholder={
                      loadingAssistants ? "Loading..." : "Select Assistant"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem
                      key={assistant.assistant_id}
                      value={assistant.assistant_id}
                    >
                      <span className="font-medium">{assistant.name || assistant.graph_id}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({assistant.assistant_id.slice(0, 8)}...)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                <Input
                  id="assistantId"
                  placeholder="<assistant-id>"
                  value={assistantId}
                  onChange={(e) => setAssistantId(e.target.value)}
                  className="bg-muted/30"
                />
                {loadingAssistants && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="langsmithApiKey" className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              LangSmith API Key{" "}
              <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider ml-1">(Optional)</span>
            </Label>
            <Input
              id="langsmithApiKey"
              type="password"
              placeholder="lsv2_pt_..."
              value={langsmithApiKey}
              onChange={(e) => setLangsmithApiKey(e.target.value)}
              className="bg-muted/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="recursionLimit" className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                Recursion Limit
              </Label>
              <Input
                id="recursionLimit"
                type="number"
                min="1"
                placeholder="100"
                value={recursionLimit}
                onChange={(e) => setRecursionLimit(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="userId" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                User ID
              </Label>
              <Input
                id="userId"
                placeholder="user-identifier"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-muted/30"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="px-8">Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
