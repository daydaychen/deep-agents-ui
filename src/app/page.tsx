"use client";

import { ChatInterface } from "@/app/components/ChatInterface";
import { ConfigDialog } from "@/app/components/ConfigDialog";
import { Memory } from "@/app/components/Memory";
import { ThreadList } from "@/app/components/ThreadList";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getConfig, saveConfig, StandaloneConfig } from "@/lib/config";
import { ChatProvider } from "@/providers/ChatProvider";
import { Database, MessagesSquare, Settings, SquarePen, X } from "lucide-react";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useState } from "react";

interface HomePageInnerProps {
  config: StandaloneConfig;
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  handleSaveConfig: (config: StandaloneConfig) => void;
}

function HomePageInner({
  config,
  configDialogOpen,
  setConfigDialogOpen,
  handleSaveConfig,
}: HomePageInnerProps) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [sidebar, setSidebar] = useQueryState("sidebar");
  const [memorySidebar, setMemorySidebar] = useQueryState("memorySidebar");

  const [mutateThreads, setMutateThreads] = useState<(() => void) | null>(null);
  const [interruptCount, setInterruptCount] = useState(0);

  return (
    <TooltipProvider>
      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        initialConfig={config}
      />
      <div className="flex h-screen flex-col">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-md sm:px-4 md:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Databus Pilot</h1>
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
                    <span className="sr-only">Threads</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Threads</TooltipContent>
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
                    <span className="sr-only">Memory</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Memory</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigDialogOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setThreadId(null)}
              disabled={!threadId}
            >
              <SquarePen className="mr-2 h-4 w-4" />
              New Thread
            </Button>
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
                        Memory
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemorySidebar(null)}
                        className="h-8 w-8"
                        aria-label="Close Memory sidebar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-hidden p-4">
                      <Memory />
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
                onHistoryRevalidate={() => mutateThreads?.()}
                config={config}
              >
                <ChatInterface />
              </ChatProvider>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}

function HomePageContent() {
  const [config, setConfig] = useState<StandaloneConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // On mount, check for saved config, otherwise show config dialog
  useEffect(() => {
    const savedConfig = getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    } else {
      setConfigDialogOpen(true);
    }
  }, []);

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
            <h1 className="text-2xl font-bold">Welcome to Databus Pilot</h1>
            <p className="mt-2 text-muted-foreground">
              Configure your API key to get started
            </p>
            <Button
              onClick={() => setConfigDialogOpen(true)}
              className="mt-4"
            >
              Open Configuration
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <HomePageInner
      config={config}
      configDialogOpen={configDialogOpen}
      setConfigDialogOpen={setConfigDialogOpen}
      handleSaveConfig={handleSaveConfig}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-4 flex w-full justify-center gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
