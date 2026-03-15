"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  Eye,
  Zap,
  Brain,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatState, useChatActions, OverrideConfig } from "@/providers/chat-context";

export const DockToolbar = React.memo(() => {
  const t = useTranslations("chat");
  const { overrideConfig } = useChatState();
  const { setOverrideConfig } = useChatActions();

  const authMode = overrideConfig.authMode || "ask";
  const isThinking = overrideConfig.thinking ?? false;
  const currentModel = overrideConfig.model?.model || "default";

  const handleAuthModeChange = (mode: OverrideConfig["authMode"]) => {
    setOverrideConfig((prev) => ({ ...prev, authMode: mode }));
  };

  const toggleThinking = () => {
    setOverrideConfig((prev) => ({ ...prev, thinking: !prev.thinking }));
  };

  const handleModelChange = (modelType: "default" | "small" | "analyst") => {
    setOverrideConfig((prev) => ({
      ...prev,
      model: modelType === "default" ? undefined : { model: modelType }
    }));
  };

  const AuthIcon = useMemo(() => ({
    ask: Shield,
    read: Eye,
    auto: Zap,
  }[authMode]), [authMode]);

  const authColor = useMemo(() => ({
    ask: "text-green-500",
    read: "text-yellow-500",
    auto: "text-red-500",
  }[authMode]), [authMode]);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-t bg-muted/10">
      {/* Model Switcher */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">{currentModel === "default" ? t("default") : t(currentModel)}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("model")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleModelChange("default")}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t("default")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleModelChange("small")}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t("small")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleModelChange("analyst")}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t("analyst")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Auth Mode Switcher */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground">
                <AuthIcon className={cn("h-4 w-4", authColor)} />
                <ChevronDown className="h-3 w-3 opacity-50" />
                <span className="sr-only">{t(`authMode.${authMode}`)}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t(`authMode.${authMode}`)}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleAuthModeChange("ask")}>
            <Shield className="mr-2 h-4 w-4 text-green-500" />
            {t("authMode.ask")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAuthModeChange("read")}>
            <Eye className="mr-2 h-4 w-4 text-yellow-500" />
            {t("authMode.read")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAuthModeChange("auto")}>
            <Zap className="mr-2 h-4 w-4 text-red-500" />
            {t("authMode.auto")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Thinking Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 transition-colors duration-200",
              isThinking ? "text-[#34d399]" : "text-muted-foreground"
            )}
            onClick={toggleThinking}
          >
            <Brain className="h-4 w-4" />
            <span className="sr-only">{t("thinking")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t(isThinking ? "thinkingOn" : "thinkingOff")}</TooltipContent>
      </Tooltip>
    </div>
  );
});

DockToolbar.displayName = "DockToolbar";
