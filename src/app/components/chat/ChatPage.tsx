"use client";

import { Assistant } from "@langchain/langgraph-sdk";
import { Database, MessagesSquare, Settings, SquarePen, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";
import useSWR from "swr";
import { ChatInterface } from "@/app/components/ChatInterface";
import { ConnectionStatusIndicator } from "@/app/components/ConnectionStatusIndicator";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getConfig, StandaloneConfig, saveConfig } from "@/lib/config";
import { DEFAULT_MESSAGE_LIMIT } from "@/lib/constants";
import { ChatProvider } from "@/providers/ChatProvider";
import { ClientProvider } from "@/providers/ClientProvider";
import { useClient } from "@/providers/client-context";

const ConfigDialog = dynamic(
  () => import("@/app/components/ConfigDialog").then((m) => m.ConfigDialog),
  {
    ssr: false,
    loading: () => null,
  },
);

const Memory = dynamic(() => import("@/app/components/Memory").then((m) => m.Memory), {
  ssr: false,
});

const ThreadList = dynamic(() => import("@/app/components/ThreadList").then((m) => m.ThreadList), {
  ssr: false,
});

interface HomePageInnerProps {
  config: StandaloneConfig;
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  handleSaveConfig: (config: StandaloneConfig) => void;
  isConfigChecked: boolean;
}

// Hoisted RegExp for UUID validation (avoids re-creation on each function call)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fetchAssistant = async ([, id]: [string, string], client: ReturnType<typeof useClient>) => {
  if (!client) throw new Error("Client not available");
  const isUUID = UUID_REGEX.test(id);

  try {
    if (isUUID) {
      return await client.assistants.get(id);
    } else {
      const assistants = await client.assistants.search({
        graphId: id,
        limit: DEFAULT_MESSAGE_LIMIT,
      });
      const defaultAssistant = assistants.find((a) => a.metadata?.["created_by"] === "system");
      if (!defaultAssistant) throw new Error("No default assistant found");
      return defaultAssistant;
    }
  } catch (_error) {
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
  isConfigChecked,
}: HomePageInnerProps) {
  const client = useClient();
  const t = useTranslations("header");
  const tCommon = useTranslations("common");
  const [threadId, setThreadId] = useQueryState("threadId");
  const [sidebar, setSidebar] = useQueryState("sidebar");
  const [memorySidebar, setMemorySidebar] = useQueryState("memorySidebar");

  const [mutateThreads, setMutateThreads] = useState<(() => void) | null>(null);
  const [interruptCount, setInterruptCount] = useState(0);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (sidebar || memorySidebar) {
      setTimeout(() => leftPanelRef.current?.expand(), 0);
    } else {
      leftPanelRef.current?.collapse();
    }
  }, [sidebar, memorySidebar]);

  // 使用 SWR 替代 useEffect/useState 获取 Assistant
  const { data: assistant } = useSWR(
    client && config.assistantId ? ["assistant", config.assistantId] : null,
    (key) => fetchAssistant(key, client),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return (
    <TooltipProvider>
      {isConfigChecked && configDialogOpen && (
        <ConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          onSave={handleSaveConfig}
          initialConfig={config}
        />
      )}
      <div className="flex h-screen flex-col bg-background">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6 z-10 w-full">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <h1 className="truncate text-base font-semibold sm:text-xl">{tCommon("appName")}</h1>
            {!sidebar && (
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
            )}
            {!memorySidebar && (
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
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden max-w-[160px] truncate text-sm text-muted-foreground md:block lg:max-w-[240px]">
              <span className="font-medium">{t("assistant")}:</span>{" "}
              {assistant?.name || config.assistantId}
              {assistant?.name && assistant.name !== assistant.assistant_id && (
                <span className="ml-1 text-[10px] opacity-60">
                  ({assistant.assistant_id.slice(0, 8)}…)
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
              variant="outline"
              size="icon"
              className="sm:hidden"
              onClick={() => setThreadId(null)}
              disabled={!threadId}
              aria-label={t("newThread")}
            >
              <SquarePen className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
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

        {/* Main App Body with Resizable Split Panes */}
        <main className="flex flex-1 overflow-hidden bg-background">
          <ResizablePanelGroup
            direction="horizontal"
            id="app-panel-group"
          >
            <ResizablePanel
              ref={leftPanelRef}
              collapsible
              collapsedSize={0}
              defaultSize={sidebar || memorySidebar ? 25 : 0}
              minSize={20}
              maxSize={50}
              className={`${!isDragging ? "transition-all duration-300 ease-in-out" : ""} ${sidebar || memorySidebar ? "opacity-100" : "opacity-0"}`}
              onCollapse={() => {
                if (sidebar) setSidebar(null);
                if (memorySidebar) setMemorySidebar(null);
              }}
            >
              <div className="flex h-full w-full flex-col overflow-hidden bg-background">
                {sidebar ? (
                  <ThreadList
                    onThreadSelect={async (id) => {
                      await setThreadId(id);
                    }}
                    onMutateReady={(fn) => setMutateThreads(() => fn)}
                    onClose={() => setSidebar(null)}
                    onInterruptCountChange={setInterruptCount}
                  />
                ) : memorySidebar ? (
                  <>
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
                      <Memory
                        config={config}
                        assistantName={assistant?.name}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </ResizablePanel>

            <ResizableHandle
              withHandle
              onDragging={setIsDragging}
              className={`transition-opacity duration-300 ${!(sidebar || memorySidebar) ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}`}
            />

            <ResizablePanel
              defaultSize={sidebar || memorySidebar ? 75 : 100}
              className={!isDragging ? "transition-all duration-300 ease-in-out" : ""}
            >
              <div className="flex h-full flex-col overflow-hidden bg-background">
                <Suspense
                  fallback={
                    <div className="flex flex-1 items-center justify-center">Loading chat...</div>
                  }
                >
                  <ChatProvider
                    activeAssistant={assistant ?? null}
                    onHistoryRevalidateAction={() => mutateThreads?.()}
                    recursionLimit={config.recursionLimit}
                    recursionMultiplier={config.recursionMultiplier}
                    config={config}
                  >
                    <ChatInterface assistant={assistant ?? null} />
                  </ChatProvider>
                </Suspense>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function ChatPage() {
  const t = useTranslations("page.welcome");
  const [config, setConfig] = useState<StandaloneConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [isConfigChecked, setIsConfigChecked] = useState(false);
  const [assistantId, setAssistantId] = useQueryState("assistantId");

  // On mount, check for saved config, otherwise show config dialog
  useEffect(() => {
    if (isConfigChecked) return;

    const savedConfig = getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      if (!assistantId) {
        setAssistantId(savedConfig.assistantId);
      }
    } else {
      setConfigDialogOpen(true);
    }
    setIsConfigChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId, setAssistantId, isConfigChecked]);
  const handleSaveConfig = useCallback(
    (newConfig: StandaloneConfig) => {
      saveConfig(newConfig);
      setConfig(newConfig);
      // Sync assistantId when config changes
      if (newConfig.assistantId && newConfig.assistantId !== assistantId) {
        setAssistantId(newConfig.assistantId);
      }
    },
    [assistantId, setAssistantId],
  );

  if (!config) {
    // 配置检查中，保持空白
    if (!isConfigChecked) {
      return null;
    }

    // 确认无配置，显示欢迎页
    return (
      <ClientProvider>
        {configDialogOpen && (
          <ConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            onSave={handleSaveConfig}
          />
        )}
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("description")}</p>
            <Button
              onClick={() => setConfigDialogOpen(true)}
              className="mt-4"
            >
              {t("button")}
            </Button>
          </div>
        </div>
      </ClientProvider>
    );
  }

  return (
    <ClientProvider>
      <HomePageInner
        config={config}
        configDialogOpen={configDialogOpen}
        setConfigDialogOpen={setConfigDialogOpen}
        handleSaveConfig={handleSaveConfig}
        isConfigChecked={isConfigChecked}
      />
    </ClientProvider>
  );
}
