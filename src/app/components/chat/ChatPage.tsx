"use client";

import { ChatInterface } from "@/app/components/ChatInterface";
import { ConfigDialog } from "@/app/components/ConfigDialog";
import { Memory } from "@/app/components/Memory";
import { ThreadList } from "@/app/components/ThreadList";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getConfig, saveConfig, StandaloneConfig } from "@/lib/config";
import { ChatProvider } from "@/providers/ChatProvider";
import { ClientProvider } from "@/providers/ClientProvider";
import { useClient } from "@/providers/client-context";
import { Assistant } from "@langchain/langgraph-sdk";
import { Database, MessagesSquare, Settings, SquarePen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";

interface HomePageInnerProps {
  config: StandaloneConfig;
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  handleSaveConfig: (config: StandaloneConfig) => void;
}

const fetchAssistant = async ([, id]: [string, string], client: ReturnType<typeof useClient>) => {
  if (!client) throw new Error("Client not available");
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    if (isUUID) {
      return await client.assistants.get(id);
    } else {
      const assistants = await client.assistants.search({
        graphId: id,
        limit: 100,
      });
      const defaultAssistant = assistants.find(
        (a) => a.metadata?.["created_by"] === "system"
      );
      if (!defaultAssistant) throw new Error("No default assistant found");
      return defaultAssistant;
    }
  } catch (error) {
    console.error("Failed to fetch assistant, using fallback:", error);
    return {
      assistant_id: id,
      graph_id: id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {},
      metadata: {},
      version: 1,
      name: id,
      context: {},
    } as Assistant;
  }
};

function HomePageInner({
  config,
  configDialogOpen,
  setConfigDialogOpen,
  handleSaveConfig,
}: HomePageInnerProps) {
  const client = useClient();
  const t = useTranslations("header");
  const tCommon = useTranslations("common");
  const [threadId, setThreadId] = useQueryState("threadId");
  const [sidebar, setSidebar] = useQueryState("sidebar");
  const [memorySidebar, setMemorySidebar] = useQueryState("memorySidebar");

  const [mutateThreads, setMutateThreads] = useState<(() => void) | null>(null);
  const [interruptCount, setInterruptCount] = useState(0);

  // 使用 SWR 替代 useEffect/useState 获取 Assistant
  const { data: assistant } = useSWR(
    client && config.assistantId ? ["assistant", config.assistantId] : null,
    (key) => fetchAssistant(key, client),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  );

  return (
    <TooltipProvider>
      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        initialConfig={config}
        currentDeploymentUrl={config.deploymentUrl}
      />
      <div className="flex h-screen flex-col">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-md sm:px-4 md:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">{tCommon("appName")}</h1>
            {!sidebar && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSidebar("1")}
                    className="relative"
                  >
                    <MessagesSquare className="h-4 w-4" />
                    {interruptCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                        {interruptCount}
                      </span>
                    )}
                    <span className="sr-only">{t("threads")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("threads")}</TooltipContent>
              </Tooltip>
            )}
            {!memorySidebar && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMemorySidebar("1")}
                  >
                    <Database className="h-4 w-4" />
                    <span className="sr-only">{t("memory")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("memory")}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{t("assistant")}:</span>{" "}
              {assistant?.name || config.assistantId}
              {assistant?.name && assistant.name !== assistant.assistant_id && (
                <span className="ml-1 opacity-60 text-[10px]">
                  ({assistant.assistant_id.slice(0, 8)}...)
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigDialogOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              {tCommon("settings")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setThreadId(null)}
              disabled={!threadId}
            >
              <SquarePen className="mr-2 h-4 w-4" />
              {t("newThread")}
            </Button>
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="standalone-chat"
          >
            {sidebar && (
              <>
                <ResizablePanel
                  id="thread-history"
                  order={1}
                  defaultSize={25}
                  minSize={20}
                  className="relative min-w-0 md:min-w-[300px]"
                >
                  <ThreadList
                    onThreadSelect={async (id) => {
                      await setThreadId(id);
                    }}
                    onMutateReady={(fn) => setMutateThreads(() => fn)}
                    onClose={() => setSidebar(null)}
                    onInterruptCountChange={setInterruptCount}
                  />
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}

            {memorySidebar && (
              <>
                <ResizablePanel
                  id="memory-sidebar"
                  order={sidebar ? 2 : 1}
                  defaultSize={25}
                  minSize={20}
                  className="relative min-w-0 md:min-w-[300px]"
                >
                  <div className="absolute inset-0 flex flex-col">
                    <div className="flex items-center justify-between border-b border-border p-4">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {t("memory")}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemorySidebar(null)}
                        className="h-8 w-8"
                        aria-label={tCommon("close")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-hidden p-4">
                      <Memory config={config} assistantName={assistant?.name} />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}

            <ResizablePanel
              id="chat"
              className="relative flex flex-col"
              order={
                sidebar && memorySidebar ? 3 : sidebar || memorySidebar ? 2 : 1
              }
            >
              <ChatProvider
                activeAssistant={assistant ?? null}
                onHistoryRevalidate={() => mutateThreads?.()}
                recursionLimit={config.recursionLimit}
                recursionMultiplier={config.recursionMultiplier}
                config={config}
              >
                <ChatInterface assistant={assistant ?? null} />
              </ChatProvider>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function ChatPage() {
  const t = useTranslations("page.welcome");
  const [config, setConfig] = useState<StandaloneConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [assistantId, setAssistantId] = useQueryState("assistantId");

  // On mount, check for saved config, otherwise show config dialog
  useEffect(() => {
    const savedConfig = getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      if (!assistantId) {
        setAssistantId(savedConfig.assistantId);
      }
    } else {
      setConfigDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If config changes, update the assistantId
  useEffect(() => {
    if (config?.assistantId && config.assistantId !== assistantId) {
      setAssistantId(config.assistantId);
    }
  }, [config?.assistantId, assistantId, setAssistantId]);

  const handleSaveConfig = useCallback((newConfig: StandaloneConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
  }, []);

  if (!config) {
    return (
      <>
        <ConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          onSave={handleSaveConfig}
        />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("description")}
            </p>
            <Button
              onClick={() => setConfigDialogOpen(true)}
              className="mt-4"
            >
              {t("button")}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <ClientProvider
      deploymentUrl={config.deploymentUrl}
    >
      <HomePageInner
        config={config}
        configDialogOpen={configDialogOpen}
        setConfigDialogOpen={setConfigDialogOpen}
        handleSaveConfig={handleSaveConfig}
      />
    </ClientProvider>
  );
}
