"use client";

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

export function DockToolbar() {
  const t = useTranslations("chat");
  const { overrideConfig } = useChatState();
  const { setOverrideConfig } = useChatActions();

  const authMode = overrideConfig.authMode || "ask";
  const isThinking = overrideConfig.thinking ?? false;

  const handleAuthModeChange = (mode: OverrideConfig["authMode"]) => {
    setOverrideConfig((prev) => ({ ...prev, authMode: mode }));
  };

  const toggleThinking = () => {
    setOverrideConfig((prev) => ({ ...prev, thinking: !prev.thinking }));
  };

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
    <div className="flex items-center gap-1 px-2 py-1.5 border-t bg-muted/10">
      {/* Model Switcher (Placeholder for now, can be expanded) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">{t("model")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("model")}</TooltipContent>
      </Tooltip>

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
            className={cn("h-7 w-7", isThinking ? "text-[#34d399]" : "text-muted-foreground")}
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
}
