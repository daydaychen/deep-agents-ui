"use client";

import { ChatInterface } from "@/app/components/ChatInterface";
import { ConfigDialog } from "@/app/components/ConfigDialog";
import { Memory } from "@/app/components/Memory";
import { ThreadList } from "@/app/components/ThreadList";
import { ConnectionStatusIndicator } from "@/app/components/ConnectionStatusIndicator";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getConfig, saveConfig, StandaloneConfig } from "@/lib/config";
import { DEFAULT_MESSAGE_LIMIT } from "@/lib/constants";
import { ChatProvider } from "@/providers/ChatProvider";
import { ClientProvider } from "@/providers/ClientProvider";
import { useClient } from "@/providers/client-context";
import { Assistant } from "@langchain/langgraph-sdk";
import { Database, MessagesSquare, Settings, SquarePen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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
        limit: DEFAULT_MESSAGE_LIMIT,
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
        <header className="sticky top-4 left-4 right-4 z-sticky mx-4 flex h-16 items-center justify-between rounded-2xl border border-border bg-background/80 px-3 backdrop-blur-md shadow-lg sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <h1 className="truncate text-base font-semibold sm:text-xl">{tCommon("appName")}</h1>
            {!sidebar && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSidebar("1");
                      setMemorySidebar(null);
                    }}
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
                    onClick={() => {
                      setMemorySidebar("1");
                      setSidebar(null);
                    }}
                  >
                    <Database className="h-4 w-4" />
                    <span className="sr-only">{t("memory")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("memory")}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden max-w-[160px] truncate text-sm text-muted-foreground md:block lg:max-w-[240px]">
              <span className="font-medium">{t("assistant")}:</span>{" "}
              {assistant?.name || config.assistantId}
              {assistant?.name && assistant.name !== assistant.assistant_id && (
                <span className="ml-1 opacity-60 text-[10px]">
                  ({assistant.assistant_id.slice(0, 8)}...)
                </span>
              )}
            </div>
            {/* Settings button: icon-only on mobile, text on sm+ */}
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden"
              onClick={() => setConfigDialogOpen(true)}
              aria-label={tCommon("settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setConfigDialogOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              {tCommon("settings")}
            </Button>
            {/* New Thread button: icon-only on mobile, text on sm+ */}
            <Button
              variant="default"
              size="icon"
              className="sm:hidden"
              onClick={() => setThreadId(null)}
              disabled={!threadId}
              aria-label={t("newThread")}
            >
              <SquarePen className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setThreadId(null)}
              disabled={!threadId}
            >
              <SquarePen className="mr-2 h-4 w-4" />
              {t("newThread")}
            </Button>
            <ConnectionStatusIndicator />
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </header>

        {/* Thread overlay panel */}
        <div className={cn("fixed left-4 right-4 bottom-4 top-[5.5rem] pointer-events-none flex transition-all duration-300 ease-out", sidebar ? "z-[301]" : "z-[300]")}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={50}
              className={cn(
                "transition-[transform,opacity] duration-300 ease-out",
                sidebar
                  ? "translate-x-0 opacity-100 pointer-events-auto"
                  : "-translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none"
              )}
            >
              <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl">
                <ThreadList
                  onThreadSelect={async (id) => {
                    await setThreadId(id);
                  }}
                  onMutateReady={(fn) => setMutateThreads(() => fn)}
                  onClose={() => setSidebar(null)}
                  onInterruptCountChange={setInterruptCount}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle
              withHandle
              className={cn(
                "w-2 outline-none bg-transparent hover:bg-primary/20 transition-all",
                sidebar ? "pointer-events-auto cursor-col-resize z-50 -ml-1 opacity-100" : "opacity-0 pointer-events-none"
              )}
            />

            <ResizablePanel defaultSize={80} className="pointer-events-none" />
          </ResizablePanelGroup>
        </div>

        {/* Memory overlay panel */}
        <div className={cn("fixed left-4 right-4 bottom-4 top-[5.5rem] pointer-events-none flex transition-all duration-300 ease-out", memorySidebar ? "z-[301]" : "z-[300]")}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={50}
              className={cn(
                "transition-[transform,opacity] duration-300 ease-out",
                memorySidebar
                  ? "translate-x-0 opacity-100 pointer-events-auto"
                  : "-translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none"
              )}
            >
              <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl">
                <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/80">
                      {t("memory")}
                    </h2>
                  </div>
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

            <ResizableHandle
              withHandle
              className={cn(
                "w-2 outline-none bg-transparent hover:bg-primary/20 transition-all",
                memorySidebar ? "pointer-events-auto cursor-col-resize z-50 -ml-1 opacity-100" : "opacity-0 pointer-events-none"
              )}
            />

            <ResizablePanel defaultSize={80} className="pointer-events-none" />
          </ResizablePanelGroup>
        </div>

        {/* Main chat area — full width */}
        <div className="flex flex-1 flex-col overflow-hidden mt-5">
          <ChatProvider
            activeAssistant={assistant ?? null}
            onHistoryRevalidate={() => mutateThreads?.()}
            recursionLimit={config.recursionLimit}
            recursionMultiplier={config.recursionMultiplier}
            config={config}
          >
            <ChatInterface assistant={assistant ?? null} />
          </ChatProvider>
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
