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
    if (!deploymentUrl || !assistantId) {
      alert("Please fill in all required fields");
      return;
    }

    const parsedRecursionLimit = parseInt(recursionLimit, 10);
    if (isNaN(parsedRecursionLimit) || parsedRecursionLimit < 1) {
      alert("Recursion limit must be a positive number");
      return;
    }

    onSave({
      deploymentUrl,
      assistantId,
      langsmithApiKey: langsmithApiKey || undefined,
      recursionLimit: parsedRecursionLimit,
      userId: userId || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription>
            Configure your LangGraph deployment settings. These settings are
            saved in your browser&apos;s local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="deploymentUrl">Deployment URL</Label>
            <Input
              id="deploymentUrl"
              placeholder="https://<deployment-url>"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assistantId">Assistant ID</Label>
            {!useCustomId && assistants.length > 0 ? (
              <>
                <Select
                  value={assistantId}
                  onValueChange={setAssistantId}
                  disabled={loadingAssistants}
                >
                  <SelectTrigger id="assistantId">
                    <SelectValue
                      placeholder={
                        loadingAssistants ? "加载中..." : "选择 Assistant"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {assistants.map((assistant) => (
                      <SelectItem
                        key={assistant.assistant_id}
                        value={assistant.assistant_id}
                      >
                        {assistant.name || assistant.graph_id} (
                        {assistant.assistant_id.slice(0, 8)}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseCustomId(true)}
                  className="text-xs text-muted-foreground"
                >
                  或手动输入 Assistant ID
                </Button>
              </>
            ) : (
              <>
                <Input
                  id="assistantId"
                  placeholder="<assistant-id>"
                  value={assistantId}
                  onChange={(e) => setAssistantId(e.target.value)}
                />
                {assistants.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseCustomId(false)}
                    className="text-xs text-muted-foreground"
                  >
                    从列表中选择
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="langsmithApiKey">
              LangSmith API Key{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="langsmithApiKey"
              type="password"
              placeholder="lsv2_pt_..."
              value={langsmithApiKey}
              onChange={(e) => setLangsmithApiKey(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recursionLimit">
              Recursion Limit{" "}
              <span className="text-muted-foreground">(Default: 100)</span>
            </Label>
            <Input
              id="recursionLimit"
              type="number"
              min="1"
              placeholder="100"
              value={recursionLimit}
              onChange={(e) => setRecursionLimit(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="userId">
              User ID <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="userId"
              placeholder="user-identifier"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
