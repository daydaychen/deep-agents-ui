"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandaloneConfig } from "@/lib/config";
import { DEFAULT_MESSAGE_LIMIT } from "@/lib/constants";
import { parseJSON } from "@/lib/safe-json-parse";
import { escapeHtml } from "@/lib/utils";
import {
  logAuditEvent,
  createAssistantConfigAuditEvent,
  createAuthModeChangeAuditEvent,
} from "@/lib/audit-logger";
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
  Tag,
  Database,
  LayoutGrid,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { KeyValueForm } from "@/app/components/ui/KeyValueForm";
import { TagInput } from "@/app/components/ui/TagInput";
import { createDuplicateKeyValidator } from "@/lib/validation";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StandaloneConfig) => void;
  initialConfig?: StandaloneConfig;
  currentDeploymentUrl?: string;
}

const assistantFormSchema = z
  .object({
    tags: z.array(z.string()),
    recursion_limit: z.number().min(1),
    authMode: z.enum(["ask", "read", "auto"]).optional(),
    defaultModel: z.string().optional(),
    configurable: z.array(z.object({ key: z.string(), value: z.string() })),
    metadata: z.array(z.object({ key: z.string(), value: z.string() })),
  })
  .superRefine((data, ctx) => {
    const validateDuplicates = createDuplicateKeyValidator();

    const configurableResult = validateDuplicates(
      data.configurable,
      "configurable"
    );
    if (configurableResult) {
      ctx.addIssue(configurableResult);
    }

    const metadataResult = validateDuplicates(data.metadata, "metadata");
    if (metadataResult) {
      ctx.addIssue(metadataResult);
    }
  });

type AssistantFormValues = z.infer<typeof assistantFormSchema>;

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
  initialConfig,
  currentDeploymentUrl,
}: ConfigDialogProps) {
  const t = useTranslations("config");
  const [deploymentUrl, setDeploymentUrl] = useState(
    initialConfig?.deploymentUrl || ""
  );
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
  const [isPendingAssistants, startLoadingAssistants] = useTransition();
  const [isPendingDetails, startLoadingDetails] = useTransition();
  const [useCustomId, setUseCustomId] = useState(false);
  const [isPendingDelete, startDeleting] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPendingUpdate, startUpdatingAssistant] = useTransition();

  const methods = useForm<AssistantFormValues>({
    resolver: zodResolver(assistantFormSchema),
    mode: "onChange",
    defaultValues: {
      tags: [],
      recursion_limit: 100,
      configurable: [],
      metadata: [],
    },
  });

  const { reset, watch, setValue } = methods;

  useEffect(() => {
    if (open && initialConfig) {
      setDeploymentUrl(initialConfig.deploymentUrl || "");
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
    const urlToUse = deploymentUrl || currentDeploymentUrl;

    if (!urlToUse || !open) {
      return;
    }

    startLoadingAssistants(async () => {
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
      }
    });
  }, [deploymentUrl, currentDeploymentUrl, open]);

  // Map assistant to form data
  const mapToForm = useMemo(() => {
    return (assistant: Assistant) => {
      const config = assistant.config || {};
      const metadata = assistant.metadata || {};
      const configurable = config.configurable || {};

      const toEntries = (
        obj: Record<string, unknown>,
        excludeKeys: string[] = []
      ) => {
        const excludeKeysSet = new Set(excludeKeys);
        return Object.entries(obj)
          .filter(([key]) => !excludeKeysSet.has(key))
          .map(([key, value]) => ({
            key,
            value: typeof value === "string" ? value : JSON.stringify(value),
          }));
      };

      const VALID_AUTH_MODES = new Set(["ask", "read", "auto"]);
      const authModeValue = String(metadata.authMode || "");
      const authMode = VALID_AUTH_MODES.has(authModeValue)
        ? (authModeValue as "ask" | "read" | "auto")
        : "ask";
      const defaultModel =
        typeof metadata.defaultModel === "string" ? metadata.defaultModel : "";

      return {
        tags: config.tags || [],
        recursion_limit: config.recursion_limit || 100,
        authMode,
        defaultModel,
        configurable: toEntries(configurable),
        metadata: toEntries(metadata, ["authMode", "defaultModel"]),
      };
    };
  }, []);

  // Map form to SDK data
  const mapFromForm = (values: AssistantFormValues) => {
    const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

    const fromEntries = (entries: { key: string; value: string }[]) => {
      const obj: Record<string, unknown> = {};
      entries.forEach(({ key, value }) => {
        if (!key || BLOCKED_KEYS.has(key)) {
          if (BLOCKED_KEYS.has(key)) {
            console.warn("Blocked prototype pollution attempt:", key);
          }
          return;
        }
        try {
          if (
            (value.startsWith("{") && value.endsWith("}")) ||
            (value.startsWith("[") && value.endsWith("]")) ||
            value === "true" ||
            value === "false" ||
            !isNaN(Number(value))
          ) {
            obj[key] = parseJSON(value);
          } else {
            obj[key] = value;
          }
        } catch {
          obj[key] = value;
        }
      });
      return obj;
    };

    const metadata = fromEntries(values.metadata);
    if (values.authMode) metadata.authMode = values.authMode;
    if (values.defaultModel) metadata.defaultModel = values.defaultModel;

    return {
      config: {
        tags: values.tags,
        recursion_limit: values.recursion_limit,
        configurable: fromEntries(values.configurable),
      },
      metadata,
    };
  };

  // Fetch selected assistant details
  useEffect(() => {
    const urlToUse = deploymentUrl || currentDeploymentUrl;

    if (!urlToUse || !assistantId || !open) {
      setSelectedAssistant(null);
      return;
    }

    startLoadingDetails(async () => {
      try {
        const client = new Client({
          apiUrl: urlToUse,
        });

        const assistant = await client.assistants.get(assistantId);
        setSelectedAssistant(assistant);
        reset(mapToForm(assistant));
      } catch (error) {
        console.error("Failed to fetch assistant details:", error);
        setSelectedAssistant(null);
      }
    });
  }, [
    assistantId,
    deploymentUrl,
    currentDeploymentUrl,
    open,
    reset,
    mapToForm,
  ]);

  const handleDeleteAssistant = async () => {
    if (!selectedAssistant) return;

    const urlToUse = deploymentUrl || currentDeploymentUrl;

    if (!urlToUse) return;

    startDeleting(async () => {
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
      }
    });
  };

  const handleSave = async () => {
    if (!deploymentUrl) {
      toast.error(t("deploymentUrlRequired"));
      return;
    }
    if (!assistantId) {
      toast.error(t("assistantIdRequired"));
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
      const urlToUse = deploymentUrl || currentDeploymentUrl;

      // Check for auth mode change to Auto mode - require confirmation (must be outside transition)
      const formValues = methods.getValues();
      const { config, metadata } = mapFromForm(formValues);
      const oldAuthMode = selectedAssistant.metadata?.authMode as
        | string
        | undefined;
      const newAuthMode = metadata.authMode as string | undefined;

      if (newAuthMode === "auto" && oldAuthMode !== "auto") {
        // Show warning confirmation dialog
        const confirmed = window.confirm(
          "切换到 Auto 模式将绕过所有安全审批。确定继续？"
        );
        if (!confirmed) {
          return;
        }

        // Log audit event for auth mode change to Auto
        const auditEvent = createAuthModeChangeAuditEvent(
          selectedAssistant.assistant_id,
          oldAuthMode,
          newAuthMode,
          userId
        );
        logAuditEvent(auditEvent);
      }

      startUpdatingAssistant(async () => {
        try {
          const client = new Client({
            apiUrl: urlToUse || "",
          });

          // Sync the local recursionLimit state to the config sent to server
          config.recursion_limit = parseInt(recursionLimit, 10);

          // Simple deep comparison to avoid redundant updates
          // Check key count first to avoid expensive JSON.stringify when obviously different
          const currentConfigKeys = Object.keys(selectedAssistant.config || {});
          const newConfigKeys = Object.keys(config || {});
          const currentMetadataKeys = Object.keys(
            selectedAssistant.metadata || {}
          );
          const newMetadataKeys = Object.keys(metadata || {});

          const keyCountsMatch =
            currentConfigKeys.length === newConfigKeys.length &&
            currentMetadataKeys.length === newMetadataKeys.length;

          let dataChanged = false;
          if (!keyCountsMatch) {
            dataChanged = true;
          } else {
            const currentData = JSON.stringify({
              config: selectedAssistant.config,
              metadata: selectedAssistant.metadata,
            });
            const newData = JSON.stringify({ config, metadata });
            dataChanged = currentData !== newData;
          }

          if (dataChanged) {
            await client.assistants.update(selectedAssistant.assistant_id, {
              config,
              metadata,
            });

            // Log general config update audit event
            const configAuditEvent = createAssistantConfigAuditEvent(
              selectedAssistant.assistant_id,
              { authMode: newAuthMode, defaultModel: metadata.defaultModel },
              userId
            );
            logAuditEvent(configAuditEvent);

            toast.success(t("assistantUpdated"));
          }
        } catch (error) {
          console.error("Failed to update assistant on server:", error);
          toast.error(t("assistantUpdateFailed"));
          // We continue to save local config anyway
        }
      });
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
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
          <DialogDescription>{t("configureDescription")}</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="general"
          className="mt-2 w-full"
        >
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger
              value="general"
              className="flex items-center gap-2"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t("general")}
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="flex items-center gap-2"
              disabled={!selectedAssistant}
            >
              <Settings2 className="h-3.5 w-3.5" />
              {t("assistantConfig")}
            </TabsTrigger>
            <TabsTrigger
              value="metadata"
              className="flex items-center gap-2"
              disabled={!selectedAssistant}
            >
              <Database className="h-3.5 w-3.5" />
              {t("assistantMetadata")}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="general"
            className="space-y-6 duration-300 animate-in fade-in-50"
          >
            <div className="grid gap-5 py-2">
              <div className="grid gap-2">
                <Label
                  htmlFor="deploymentUrl"
                  className="flex items-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {t("deploymentUrl")}
                </Label>
                <Input
                  id="deploymentUrl"
                  placeholder={t("deploymentUrlPlaceholder")}
                  value={deploymentUrl}
                  onChange={(e) => setDeploymentUrl(e.target.value)}
                  className="h-9 bg-muted/30"
                />
              </div>

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
                        disabled={isPendingAssistants}
                      >
                        <SelectTrigger
                          id="assistantId"
                          className="h-9 bg-muted/30"
                        >
                          <SelectValue
                            placeholder={
                              isPendingAssistants
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
                          className="h-9 bg-muted/30"
                        />
                        {isPendingAssistants && (
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
                        className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
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
                                name: escapeHtml(
                                  selectedAssistant.name ||
                                    selectedAssistant.graph_id
                                ),
                                strong: (chunks: React.ReactNode) => (
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
                              disabled={isPendingDelete}
                            >
                              {isPendingDelete ? (
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

              {selectedAssistant && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-3 text-[10px]">
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
                    className="h-9 bg-muted/30"
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
                    className="h-9 bg-muted/30"
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
                    className="h-9 bg-muted/30"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="config"
            className="space-y-6 duration-300 animate-in fade-in-50"
          >
            {isPendingDetails ? (
              <div className="flex justify-center py-12">
                <Loader2 className="text-primary/50 h-8 w-8 animate-spin" />
              </div>
            ) : (
              <FormProvider {...methods}>
                <div className="grid gap-6 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1.5">
                        <Settings2 className="h-3.5 w-3.5" />
                        {t("defaultAuthMode")}
                      </Label>
                      <Select
                        value={watch("authMode")}
                        onValueChange={(val) =>
                          setValue("authMode", val as "ask" | "read" | "auto")
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ask">
                            🛡️ {t("authMode.ask")}
                          </SelectItem>
                          <SelectItem value="read">
                            👁️ {t("authMode.read")}
                          </SelectItem>
                          <SelectItem value="auto">
                            ⚡ {t("authMode.auto")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        {t("defaultModel")}
                      </Label>
                      <Input
                        value={watch("defaultModel")}
                        onChange={(e) =>
                          setValue("defaultModel", e.target.value)
                        }
                        placeholder="e.g. gpt-4o"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      {t("tags")}
                    </Label>
                    <TagInput
                      tags={watch("tags")}
                      onChange={(tags) => setValue("tags", tags)}
                      placeholder="Add tag..."
                    />
                  </div>

                  <KeyValueForm
                    name="configurable"
                    label={t("configurable")}
                    suggestions={[
                      {
                        label: "Workspace",
                        key: "workspace_path",
                        defaultValue: "/workspace",
                      },
                      {
                        label: "Style",
                        key: "coding_style",
                        defaultValue: "react-best-practices",
                      },
                      {
                        label: "User ID",
                        key: "user_id",
                        defaultValue: "user",
                      },
                    ]}
                  />
                </div>
              </FormProvider>
            )}
          </TabsContent>

          <TabsContent
            value="metadata"
            className="space-y-6 duration-300 animate-in fade-in-50"
          >
            {isPendingDetails ? (
              <div className="flex justify-center py-12">
                <Loader2 className="text-primary/50 h-8 w-8 animate-spin" />
              </div>
            ) : (
              <FormProvider {...methods}>
                <div className="py-2">
                  <KeyValueForm
                    name="metadata"
                    label={t("assistantMetadata")}
                  />
                </div>
              </FormProvider>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="min-w-[120px] px-8"
            disabled={
              isPendingDetails ||
              isPendingUpdate ||
              !methods.formState.isValid
            }
          >
            {isPendingUpdate || isPendingDelete ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("saveSettings")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
