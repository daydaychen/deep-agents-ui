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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StandaloneConfig } from "@/lib/config";
import { DEFAULT_MESSAGE_LIMIT } from "@/lib/constants";
import { Client } from "@langchain/langgraph-sdk";
import type { Assistant } from "@langchain/langgraph-sdk";
import { toast } from "sonner";
import {
  Loader2,
  Settings2,
  Globe,
  ListFilter,
  Hash,
  User,
  Calendar,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StandaloneConfig) => void;
  initialConfig?: StandaloneConfig;
  currentDeploymentUrl?: string;
}

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
  initialConfig,
  currentDeploymentUrl,
}: ConfigDialogProps) {
  const t = useTranslations("config");
  // 从环境变量读取部署URL，不再允许用户手动输入
  const deploymentUrl = process.env.NEXT_PUBLIC_BACKEND_URL || currentDeploymentUrl || "";
  const [assistantId, setAssistantId] = useState(
    initialConfig?.assistantId || ""
  );
  const [recursionLimit, setRecursionLimit] = useState(
    initialConfig?.recursionLimit?.toString() || "100"
  );
  const [recursionMultiplier, setRecursionMultiplier] = useState(
    initialConfig?.recursionMultiplier?.toString() || "6"
  );
  const [userId, setUserId] = useState(initialConfig?.userId || "");
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(
    null
  );
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [useCustomId, setUseCustomId] = useState(false);

  const [assistantConfig, setAssistantConfig] = useState("{}");
  const [assistantMetadata, setAssistantMetadata] = useState("{}");
  const [configError, setConfigError] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open && initialConfig) {
      setAssistantId(initialConfig.assistantId);
      setRecursionLimit(initialConfig.recursionLimit?.toString() || "100");
      setRecursionMultiplier(
        initialConfig.recursionMultiplier?.toString() || "6"
      );
      setUserId(initialConfig.userId || "");
    }
  }, [open, initialConfig]);

  // Fetch assistants when deployment URL is available
  useEffect(() => {
    const fetchAssistants = async () => {
      const urlToUse = deploymentUrl || currentDeploymentUrl;

      if (!urlToUse || !open) {
        return;
      }

      setLoadingAssistants(true);
      try {
        const client = new Client({
          apiUrl: urlToUse,
        });

        const assistantsList = await client.assistants.search({
          limit: DEFAULT_MESSAGE_LIMIT,
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
    open,
  ]);

  // Fetch selected assistant details
  useEffect(() => {
    const fetchDetails = async () => {
      const urlToUse = deploymentUrl || currentDeploymentUrl;

      if (!urlToUse || !assistantId || !open) {
        setSelectedAssistant(null);
        return;
      }

      setLoadingDetails(true);
      try {
        const client = new Client({
          apiUrl: urlToUse,
        });

        const assistant = await client.assistants.get(assistantId);
        setSelectedAssistant(assistant);
        setAssistantConfig(JSON.stringify(assistant.config || {}, null, 2));
        setAssistantMetadata(JSON.stringify(assistant.metadata || {}, null, 2));
        setConfigError(null);
        setMetadataError(null);
      } catch (error) {
        console.error("Failed to fetch assistant details:", error);
        setSelectedAssistant(null);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [
    assistantId,
    deploymentUrl,
    currentDeploymentUrl,
    open,
  ]);

  const handleConfigChange = (val: string) => {
    setAssistantConfig(val);
    try {
      JSON.parse(val);
      setConfigError(null);
    } catch (e) {
      setConfigError((e as Error).message);
    }
  };

  const handleMetadataChange = (val: string) => {
    setAssistantMetadata(val);
    try {
      JSON.parse(val);
      setMetadataError(null);
    } catch (e) {
      setMetadataError((e as Error).message);
    }
  };

  const handleDeleteAssistant = async () => {
    if (!selectedAssistant) return;

    const urlToUse = deploymentUrl || currentDeploymentUrl;

    if (!urlToUse) return;

    setIsDeleting(true);
    try {
      const client = new Client({
        apiUrl: urlToUse,
      });

      await client.assistants.delete(selectedAssistant.assistant_id);
      toast.success(t("assistantDeleted"));
      setAssistantId("");
      setAssistants((prev) =>
        prev.filter((a) => a.assistant_id !== selectedAssistant.assistant_id)
      );
      setSelectedAssistant(null);
    } catch (error) {
      console.error("Failed to delete assistant:", error);
      toast.error(t("assistantDeleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!deploymentUrl) {
      toast.error(t("backendUrlNotConfigured"));
      return;
    }
    if (!assistantId) {
      toast.error(t("assistantIdRequired"));
      return;
    }

    if (configError || metadataError) {
      toast.error(t("fixJsonErrors"));
      return;
    }

    const parsedRecursionLimit = parseInt(recursionLimit, 10);
    if (isNaN(parsedRecursionLimit) || parsedRecursionLimit < 1) {
      toast.error(t("recursionLimitPositive"));
      return;
    }

    const parsedRecursionMultiplier = parseInt(recursionMultiplier, 10);
    if (isNaN(parsedRecursionMultiplier) || parsedRecursionMultiplier < 1) {
      toast.error(t("recursionMultiplierPositive"));
      return;
    }

    // Update assistant on server if details are modified
    if (selectedAssistant) {
      try {
        const urlToUse = deploymentUrl || currentDeploymentUrl;
        const client = new Client({
          apiUrl: urlToUse || "",
        });

        const newConfig = JSON.parse(assistantConfig);
        const newMetadata = JSON.parse(assistantMetadata);

        if (
          JSON.stringify(newConfig) !==
            JSON.stringify(selectedAssistant.config) ||
          JSON.stringify(newMetadata) !==
            JSON.stringify(selectedAssistant.metadata)
        ) {
          await client.assistants.update(selectedAssistant.assistant_id, {
            config: newConfig,
            metadata: newMetadata,
          });
          toast.success(t("assistantUpdated"));
        }
      } catch (error) {
        console.error("Failed to update assistant on server:", error);
        toast.error(t("assistantUpdateFailed"));
        // We continue to save local config anyway
      }
    }

    onSave({
      deploymentUrl: deploymentUrl || "",
      assistantId,
      recursionLimit: parsedRecursionLimit,
      recursionMultiplier: parsedRecursionMultiplier,
      userId: userId || undefined,
    });
    toast.success(t("settingsSaved"));
    onOpenChange(false);
  };

  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return t("notAvailable");
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
          <DialogDescription>{t("configureDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="assistantId"
                className="flex items-center gap-1.5"
              >
                <ListFilter className="h-3.5 w-3.5" />
                {t("assistantId")}
              </Label>
              {assistants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseCustomId(!useCustomId)}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {useCustomId ? t("selectFromList") : t("enterManually")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                {!useCustomId && assistants.length > 0 ? (
                  <Select
                    value={assistantId}
                    onValueChange={setAssistantId}
                    disabled={loadingAssistants}
                  >
                    <SelectTrigger
                      id="assistantId"
                      className="bg-muted/30"
                    >
                      <SelectValue
                        placeholder={
                          loadingAssistants
                            ? t("loadingAssistants")
                            : t("assistantIdPlaceholder")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {assistants.map((assistant) => (
                        <SelectItem
                          key={assistant.assistant_id}
                          value={assistant.assistant_id}
                        >
                          <span className="font-medium">
                            {assistant.name || assistant.graph_id}
                          </span>
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
                      placeholder={t("assistantIdPlaceholder")}
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
              {selectedAssistant && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <Dialog
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                  >
                    <DialogContent className="sm:max-w-[400px]">
                      <DialogHeader>
                        <DialogTitle>{t("deleteAssistant")}</DialogTitle>
                        <DialogDescription>
                          {t.rich("deleteAssistantDescription", {
                            name:
                              selectedAssistant.name ||
                              selectedAssistant.graph_id,
                            strong: (chunks: any) => (
                              <strong className="font-semibold text-foreground">
                                {chunks}
                              </strong>
                            ),
                          })}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          {t("cancel")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            await handleDeleteAssistant();
                            setShowDeleteConfirm(false);
                          }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            t("deletePermanently")
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>

          {loadingDetails ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            selectedAssistant && (
              <div className="grid gap-4 rounded-lg border bg-muted/10 p-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {t("created")}:{" "}
                    {formattedDate(selectedAssistant.created_at)}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {t("updated")}:{" "}
                    {formattedDate(selectedAssistant.updated_at)}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      {t("assistantConfig")}
                    </Label>
                    {configError && (
                      <span className="flex items-center gap-1 text-[10px] text-destructive">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {t("invalidJson")}
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={assistantConfig}
                    onChange={(e) => handleConfigChange(e.target.value)}
                    className={`h-24 bg-background font-mono text-xs ${
                      configError ? "border-destructive" : ""
                    }`}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      {t("assistantMetadata")}
                    </Label>
                    {metadataError && (
                      <span className="flex items-center gap-1 text-[10px] text-destructive">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {t("invalidJson")}
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={assistantMetadata}
                    onChange={(e) => handleMetadataChange(e.target.value)}
                    className={`h-24 bg-background font-mono text-xs ${
                      metadataError ? "border-destructive" : ""
                    }`}
                  />
                </div>
              </div>
            )
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="recursionLimit"
                className="flex items-center gap-1.5"
              >
                <Hash className="h-3.5 w-3.5" />
                {t("recursionLimit")}
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
              <Label
                htmlFor="recursionMultiplier"
                className="flex items-center gap-1.5"
              >
                <Hash className="h-3.5 w-3.5" />
                {t("recursionMultiplier")}
              </Label>
              <Input
                id="recursionMultiplier"
                type="number"
                min="1"
                placeholder="6"
                value={recursionMultiplier}
                onChange={(e) => setRecursionMultiplier(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="userId"
                className="flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5" />
                {t("userId")}
              </Label>
              <Input
                id="userId"
                placeholder={t("userIdPlaceholder")}
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
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="px-8"
            disabled={!!configError || !!metadataError}
          >
            {t("saveSettings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
