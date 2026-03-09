"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  Square,
  Command,
  Sparkles,
  Zap,
  Brain,
  SlidersHorizontal,
  Info,
  Settings2,
} from "lucide-react";
import React, {
  FormEvent,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useChatState, useChatActions } from "@/providers/chat-context";
import {
  type LLMOverrideConfig,
  type OverrideConfig,
} from "@/app/hooks/useChat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

interface ModelOption {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Models list - defined outside component to avoid recreating on each render
const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "Qwen/Qwen3.5-397B-A17B",
    name: "Qwen 3.5 397B",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3.5-122B-A10B",
    name: "Qwen 3.5 122B",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3.5-35B-A3B",
    name: "Qwen 3.5 35B",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3.5-27B",
    name: "Qwen 3.5 27B",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    name: "Qwen 3 Coder",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    name: "Qwen 3 Coder 30B",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3-30B-A3B-Instruct-2507",
    name: "Qwen 3 30B Instruct",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3-30B-A3B-Thinking-2507",
    name: "Qwen 3 30B Thinking",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    name: "Qwen 3 235B",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
    name: "Qwen 3 235B Thinking",
    icon: <Sparkles className="h-3 w-3 text-orange-500" />,
  },
  {
    id: "deepseek-ai/DeepSeek-V3.2",
    name: "DeepSeek V3.2",
    icon: <Sparkles className="h-3 w-3 text-blue-500" />,
  },
  {
    id: "MiniMax/MiniMax-M2.5",
    name: "MiniMax M2.5",
    icon: <Zap className="h-3 w-3 text-yellow-500" />,
  },
  {
    id: "ZhipuAI/GLM-5",
    name: "GLM-5",
    icon: <Brain className="h-3 w-3 text-cyan-500" />,
  },
  {
    id: "moonshotai/Kimi-K2.5",
    name: "Kimi K2.5",
    icon: <Zap className="h-3 w-3 text-emerald-500" />,
  },
];

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  submitDisabled: boolean;
  onSubmit: (e?: FormEvent) => void;
  onStop: () => void;
}

export const ChatInput = React.memo<ChatInputProps>(
  ({ input, setInput, isLoading, submitDisabled, onSubmit, onStop }) => {
    const t = useTranslations("chat");
    const isComposingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const { overrideConfig, config, threadId } = useChatState();
    const { setOverrideConfig } = useChatActions();

    // Auto-resize textarea based on content
    React.useLayoutEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        // Reset height to let it shrink if needed, then set to scrollHeight
        textarea.style.height = "inherit";
        const scrollHeight = textarea.scrollHeight;
        if (scrollHeight > 0) {
          textarea.style.height = `${scrollHeight}px`;
        }
      }
    }, [input]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (submitDisabled) return;
        if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
          e.preventDefault();
          onSubmit();
        }
      },
      [onSubmit, submitDisabled]
    );

    // Auto-focus textarea on mount or when switching threads
    useEffect(() => {
      textareaRef.current?.focus();
    }, [threadId]);

    const hasInput = input.trim().length > 0;

    const handleSubmitClick = useCallback(() => {
      if (hasInput) {
        onSubmit();
      }
    }, [hasInput, onSubmit]);

    const updateOverride = useCallback(
      (
        agentKey: keyof Omit<
          OverrideConfig,
          "recursionLimit" | "interruptBefore" | "interruptAfter"
        >,
        field: keyof LLMOverrideConfig,
        value: any
      ) => {
        setOverrideConfig((prev) => ({
          ...prev,
          [agentKey]: {
            ...(prev[agentKey] || {}),
            [field]: value === "" ? undefined : value,
          },
        }));
      },
      [setOverrideConfig]
    );

    const renderLLMConfig = (
      agentKey: keyof Omit<
        OverrideConfig,
        "recursionLimit" | "interruptBefore" | "interruptAfter"
      >
    ) => {
      const overrides = (overrideConfig as any)[agentKey] || {};
      return (
        <div className="grid gap-3 pt-2">
          <div className="grid gap-1.5">
            <Label className="text-2xs uppercase tracking-wider text-muted-foreground">
              {t("model")}
            </Label>
            <Select
              value={overrides.model || "__default__"}
              onValueChange={(val) =>
                updateOverride(
                  agentKey,
                  "model",
                  val === "__default__" ? "" : val
                )
              }
            >
              <SelectTrigger className="h-7 bg-muted/20 text-xs">
                <SelectValue placeholder={t("defaultModel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">{t("default")}</SelectItem>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                  >
                    <div className="flex items-center gap-2">
                      {m.icon}
                      <span>{m.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-2xs uppercase tracking-wider text-muted-foreground">
                  {t("temp")}
                </Label>
                <span className="font-mono text-2xs opacity-50">
                  {overrides.temperature ?? t("default")}
                </span>
              </div>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                placeholder="0.7"
                value={overrides.temperature ?? ""}
                onChange={(e) =>
                  updateOverride(
                    agentKey,
                    "temperature",
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value)
                  )
                }
                className="h-7 bg-muted/20 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-2xs uppercase tracking-wider text-muted-foreground">
                  {t("tokens")}
                </Label>
                <span className="font-mono text-2xs opacity-50">
                  {overrides.max_completion_tokens ?? t("default")}
                </span>
              </div>
              <Input
                type="number"
                placeholder="4096"
                value={overrides.max_completion_tokens ?? ""}
                onChange={(e) =>
                  updateOverride(
                    agentKey,
                    "max_completion_tokens",
                    e.target.value === "" ? undefined : parseInt(e.target.value)
                  )
                }
                className="h-7 bg-muted/20 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-2xs uppercase tracking-wider text-muted-foreground">
                  {t("topP")}
                </Label>
                <span className="font-mono text-2xs opacity-50">
                  {overrides.top_p ?? t("default")}
                </span>
              </div>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.05"
                placeholder="1.0"
                value={overrides.top_p ?? ""}
                onChange={(e) =>
                  updateOverride(
                    agentKey,
                    "top_p",
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value)
                  )
                }
                className="h-7 bg-muted/20 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-2xs uppercase tracking-wider text-muted-foreground">
                  {t("presence")}
                </Label>
                <span className="font-mono text-2xs opacity-50">
                  {overrides.presence_penalty ?? t("default")}
                </span>
              </div>
              <Input
                type="number"
                min="-2"
                max="2"
                step="0.1"
                placeholder="0.0"
                value={overrides.presence_penalty ?? ""}
                onChange={(e) =>
                  updateOverride(
                    agentKey,
                    "presence_penalty",
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value)
                  )
                }
                className="h-7 bg-muted/20 text-xs"
              />
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="px-2 pb-3">
        <div
          className={cn(
            "relative flex flex-col gap-0.5 rounded-2xl bg-transparent px-1 transition-[background-color,border-color,box-shadow,opacity,transform] duration-300",
            isFocused ? "bg-muted/5 shadow-inner" : ""
          )}
        >
          <div className="relative flex flex-1 flex-col px-2 pt-0.5">
            <label
              htmlFor="chat-input"
              className="sr-only"
            >
              {t("messageLabel")}
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              placeholder={
                isLoading
                  ? t("inputPlaceholderLoading")
                  : t("inputPlaceholderDefault")
              }
              className={cn(
                "flex-1 resize-none border-0 bg-transparent py-2.5 font-sans text-[15px] leading-relaxed text-foreground outline-none ring-0 transition-[opacity,color,background-color] placeholder:text-muted-foreground/40",
                "max-h-[300px] min-h-[40px] overflow-y-auto"
              )}
              style={{
                fieldSizing: "content",
              }}
              rows={1}
            />
          </div>

          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6.5 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("runOptions")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-80 overflow-hidden border-border/50 bg-popover/95 p-0 shadow-2xl backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-tight">
                        {t("runtimeConfiguration")}
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-[200px] text-xs"
                      >
                        {t("runtimeConfigTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="p-3">
                    <Tabs
                      defaultValue="model"
                      className="w-full"
                    >
                      <TabsList className="grid h-8 w-full grid-cols-5 bg-muted/30 p-1">
                        <TabsTrigger
                          value="model"
                          className="px-0 text-2xs"
                        >
                          {t("model")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="small_model"
                          className="px-0 text-2xs"
                        >
                          {t("small")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="analyst"
                          className="px-0 text-2xs"
                        >
                          {t("analyst")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="validator"
                          className="px-0 text-2xs"
                        >
                          {t("validator")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="specialist"
                          className="px-0 text-2xs"
                        >
                          {t("config")}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="model">
                        {renderLLMConfig("model")}
                      </TabsContent>
                      <TabsContent value="small_model">
                        {renderLLMConfig("small_model")}
                      </TabsContent>
                      <TabsContent value="analyst">
                        {renderLLMConfig("analyst")}
                      </TabsContent>
                      <TabsContent value="validator">
                        {renderLLMConfig("config_validator")}
                      </TabsContent>
                      <TabsContent value="specialist">
                        {renderLLMConfig("databus_specialist")}
                      </TabsContent>
                    </Tabs>

                    <div className="mt-4 grid gap-3 border-t border-border/50 pt-3">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-2xs uppercase tracking-wider text-muted-foreground">
                            {t("recursionLimit")}
                          </Label>
                          <span className="bg-primary/10 rounded px-1.5 py-0.5 font-mono text-2xs text-primary">
                            {overrideConfig.recursionLimit ||
                              config.recursionLimit ||
                              100}
                          </span>
                        </div>
                        <Input
                          type="range"
                          min="1"
                          max="200"
                          step="1"
                          value={
                            overrideConfig.recursionLimit ||
                            config.recursionLimit ||
                            100
                          }
                          onChange={(e) =>
                            setOverrideConfig((prev) => ({
                              ...prev,
                              recursionLimit: parseInt(e.target.value),
                            }))
                          }
                          className="h-4 p-0 accent-primary"
                        />
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">
                            {t("interruptBeforeTools")}
                          </span>
                          <Switch
                            checked={
                              overrideConfig.interruptBefore?.includes(
                                "tools"
                              ) || false
                            }
                            onCheckedChange={(checked) =>
                              setOverrideConfig((prev) => ({
                                ...prev,
                                interruptBefore: checked ? ["tools"] : [],
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">
                            {t("interruptAfterTools")}
                          </span>
                          <Switch
                            checked={
                              overrideConfig.interruptAfter?.includes(
                                "tools"
                              ) || false
                            }
                            onCheckedChange={(checked) =>
                              setOverrideConfig((prev) => ({
                                ...prev,
                                interruptAfter: checked ? ["tools"] : [],
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-3 w-[1px] bg-border/20" />

              <div className="flex items-center gap-4 text-muted-foreground/20">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex scale-90 items-center gap-0.5 rounded border border-border/30 bg-muted/20 px-1 py-0.5 font-mono text-2xs">
                    <Command size={8} />
                    <span>Enter</span>
                  </div>
                  <span>{t("sendShortcut")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {isLoading ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onStop}
                  disabled={!isLoading}
                  className="h-7 gap-2 rounded-lg border-destructive/10 bg-destructive/5 text-2xs font-bold text-destructive transition-[background-color,color,opacity,transform] hover:bg-destructive/10 cursor-pointer"
                >
                  <Square
                    size={10}
                    fill="currentColor"
                  />
                  {t("stopCore")}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitClick}
                  size="icon-sm"
                  disabled={submitDisabled || !hasInput}
                  className={cn(
                    "rounded-xl will-change-[box-shadow,filter] cursor-pointer transition-[background-color,border-color,color,box-shadow,filter,opacity] duration-200",
                    hasInput
                      ? "text-primary-foreground bg-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:brightness-110 active:brightness-90"
                      : "bg-muted text-muted-foreground/20 opacity-30"
                  )}
                >
                  <ArrowUp
                    size={16}
                    strokeWidth={3}
                  />
                  <span className="sr-only">{t("send")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
