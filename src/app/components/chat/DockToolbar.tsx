"use client";

import { Brain, ChevronDown, Eye, Shield, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODEL_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { OverrideConfig } from "@/providers/chat-context";
import { useChatStore } from "@/providers/chat-store-provider";

interface DockToolbarProps {
  onAction?: () => void;
}

export const DockToolbar = React.memo(({ onAction }: DockToolbarProps) => {
  const t = useTranslations("chat");
  const overrideConfig = useChatStore((s) => s.overrideConfig);
  const setOverrideConfig = useChatStore((s) => s.setOverrideConfig);

  const authMode = overrideConfig.authMode || "ask";
  const isThinking = overrideConfig.thinking ?? false;
  const currentModel = overrideConfig.model?.model || "";

  const handleAuthModeChange = (mode: OverrideConfig["authMode"]) => {
    setOverrideConfig((prev) => ({ ...prev, authMode: mode }));
    onAction?.();
  };

  const toggleThinking = () => {
    setOverrideConfig((prev) => ({ ...prev, thinking: !prev.thinking }));
    onAction?.();
  };

  const handleModelChange = (modelId: string) => {
    setOverrideConfig((prev) => ({
      ...prev,
      model: modelId ? { model: modelId } : undefined,
    }));
    onAction?.();
  };

  // Find current model option
  const currentModelOption = MODEL_OPTIONS.find((m) => m.id === currentModel);

  const AuthIcon = {
    ask: Shield,
    read: Eye,
    auto: Zap,
  }[authMode];

  const authColor = {
    ask: "text-green-500",
    read: "text-yellow-500",
    auto: "text-red-500",
  }[authMode];

  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {/* Model Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-muted-foreground/80 transition-all hover:bg-muted/50 hover:text-foreground active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
            <span className="max-w-[120px] truncate text-xs font-medium">
              {currentModelOption?.name || t("default")}
            </span>
            <ChevronDown className="h-3 w-3 opacity-30" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="min-w-[180px] max-h-[400px] overflow-y-auto rounded-xl border-border/50 bg-background/95 backdrop-blur-md shadow-xl"
        >
          <DropdownMenuItem
            onClick={() => handleModelChange("")}
            className="gap-2 rounded-lg m-1 cursor-pointer focus:bg-muted/60"
          >
            <Sparkles className="h-4 w-4 opacity-50" />
            <span className="text-sm">{t("default")}</span>
          </DropdownMenuItem>
          {MODEL_OPTIONS.map((modelOption) => (
            <DropdownMenuItem
              key={modelOption.id}
              onClick={() => handleModelChange(modelOption.id)}
              className="gap-2 rounded-lg m-1 cursor-pointer focus:bg-muted/60"
            >
              <Sparkles className="h-4 w-4 opacity-50" />
              <span className="text-sm">{modelOption.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-3 w-px bg-border/20 mx-0.5" />

      {/* Auth Mode Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-11 gap-1 rounded-full p-0 text-muted-foreground/80 transition-all hover:bg-muted/50 hover:text-foreground active:scale-95"
          >
            <AuthIcon className={cn("h-4 w-4 transition-colors", authColor)} />
            <ChevronDown className="h-2.5 w-2.5 opacity-30" />
            <span className="sr-only">{t(`authMode.${authMode}`)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="min-w-[160px] rounded-xl border-border/50 bg-background/95 backdrop-blur-md shadow-xl"
        >
          <DropdownMenuItem
            onClick={() => handleAuthModeChange("ask")}
            className="gap-2 rounded-lg m-1 cursor-pointer focus:bg-muted/60"
          >
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{t("authMode.ask")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleAuthModeChange("read")}
            className="gap-2 rounded-lg m-1 cursor-pointer focus:bg-muted/60"
          >
            <Eye className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{t("authMode.read")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleAuthModeChange("auto")}
            className="gap-2 rounded-lg m-1 cursor-pointer focus:bg-muted/60"
          >
            <Zap className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">{t("authMode.auto")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-3 w-px bg-border/20 mx-0.5" />

      {/* Thinking Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-all duration-300 active:scale-95",
          isThinking
            ? "bg-[#34d399]/10 text-[#34d399] hover:bg-[#34d399]/20 shadow-[0_0_15px_-5px_#34d39966]"
            : "text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground",
        )}
        onClick={toggleThinking}
      >
        <Brain className={cn("h-4 w-4 transition-transform", isThinking && "scale-110")} />
        <span className="sr-only">{t("thinking")}</span>
      </Button>
    </div>
  );
});

DockToolbar.displayName = "DockToolbar";
