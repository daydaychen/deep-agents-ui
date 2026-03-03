"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, Square, Command, Sparkles, Zap, Brain, SlidersHorizontal, Info, Settings2 } from "lucide-react";
import React, { FormEvent, useCallback, useRef, useEffect, useState } from "react";
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
import { type LLMOverrideConfig, type OverrideConfig } from "@/app/hooks/useChat";
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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
    const isComposingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const { overrideConfig, config } = useChatState();
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

    // Auto-focus textarea on mount
    useEffect(() => {
      textareaRef.current?.focus();
    }, []);

    const hasInput = input.trim().length > 0;

    const models = [
      { id: "Qwen/Qwen3.5-397B-A17B", name: "Qwen 3.5 397B", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3.5-122B-A10B", name: "Qwen 3.5 122B", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3.5-35B-A3B", name: "Qwen 3.5 35B", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3.5-27B", name: "Qwen 3.5 27B", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3-Coder-480B-A35B-Instruct", name: "Qwen 3 Coder", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3-Coder-30B-A3B-Instruct", name: "Qwen 3 Coder 30B", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3-30B-A3B-Instruct-2507", name: "Qwen 3 30B Instruct", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3-30B-A3B-Thinking-2507", name: "Qwen 3 30B Thinking", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3-235B-A22B-Instruct-2507", name: "Qwen 3 235B", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "Qwen/Qwen3-235B-A22B-Thinking-2507", name: "Qwen 3 235B Thinking", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "deepseek-ai/DeepSeek-V3.2", name: "DeepSeek V3.2", icon: <Sparkles className="h-3 w-3 text-blue-500" /> },
      { id: "MiniMax/MiniMax-M2.5", name: "MiniMax M2.5", icon: <Zap className="h-3 w-3 text-yellow-500" /> },
      { id: "ZhipuAI/GLM-5", name: "GLM-5", icon: <Brain className="h-3 w-3 text-cyan-500" /> },
      { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5", icon: <Zap className="h-3 w-3 text-emerald-500" /> },
    ];

    const updateOverride = (agentKey: keyof Omit<OverrideConfig, 'recursionLimit' | 'interruptBefore' | 'interruptAfter'>, field: keyof LLMOverrideConfig, value: any) => {
      setOverrideConfig(prev => ({
        ...prev,
        [agentKey]: {
          ...(prev[agentKey] || {}),
          [field]: value === "" ? undefined : value
        }
      }));
    };

    const renderLLMConfig = (agentKey: keyof Omit<OverrideConfig, 'recursionLimit' | 'interruptBefore' | 'interruptAfter'>) => {
      const overrides = (overrideConfig as any)[agentKey] || {};
      return (
        <div className="grid gap-3 pt-2">
          <div className="grid gap-1.5">
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Model</Label>
            <Select
              value={overrides.model || "__default__"}
              onValueChange={(val) => updateOverride(agentKey, 'model', val === "__default__" ? "" : val)}
            >
              <SelectTrigger className="h-7 text-[11px] bg-muted/20">
                <SelectValue placeholder="Default Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Default</SelectItem>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>
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
                <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Temp</Label>
                <span className="text-[9px] font-mono opacity-50">{overrides.temperature ?? "Default"}</span>
              </div>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                placeholder="0.7"
                value={overrides.temperature ?? ""}
                onChange={(e) => updateOverride(agentKey, 'temperature', e.target.value === "" ? undefined : parseFloat(e.target.value))}
                className="h-7 text-[11px] bg-muted/20"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Tokens</Label>
                <span className="text-[9px] font-mono opacity-50">{overrides.max_completion_tokens ?? "Default"}</span>
              </div>
              <Input
                type="number"
                placeholder="4096"
                value={overrides.max_completion_tokens ?? ""}
                onChange={(e) => updateOverride(agentKey, 'max_completion_tokens', e.target.value === "" ? undefined : parseInt(e.target.value))}
                className="h-7 text-[11px] bg-muted/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Top P</Label>
                <span className="text-[9px] font-mono opacity-50">{overrides.top_p ?? "Default"}</span>
              </div>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.05"
                placeholder="1.0"
                value={overrides.top_p ?? ""}
                onChange={(e) => updateOverride(agentKey, 'top_p', e.target.value === "" ? undefined : parseFloat(e.target.value))}
                className="h-7 text-[11px] bg-muted/20"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Presence</Label>
                <span className="text-[9px] font-mono opacity-50">{overrides.presence_penalty ?? "Default"}</span>
              </div>
              <Input
                type="number"
                min="-2"
                max="2"
                step="0.1"
                placeholder="0.0"
                value={overrides.presence_penalty ?? ""}
                onChange={(e) => updateOverride(agentKey, 'presence_penalty', e.target.value === "" ? undefined : parseFloat(e.target.value))}
                className="h-7 text-[11px] bg-muted/20"
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
            "relative flex flex-col gap-1 rounded-2xl bg-transparent px-2 transition-[background-color,border-color,box-shadow,opacity,transform] duration-300",
            isFocused ? "bg-muted/5 shadow-inner" : ""
          )}
        >
          <div className="relative flex flex-1 flex-col px-2 pt-1">
            <label htmlFor="chat-input" className="sr-only">
              Message AI assistant
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
              placeholder={isLoading ? "AI is processing…" : "Message Deep Agent…"}
              className={cn(
                "font-sans flex-1 resize-none border-0 bg-transparent py-3 text-[15px] leading-relaxed text-foreground outline-none ring-0 placeholder:text-muted-foreground/40 transition-[opacity,color,background-color]",
                "min-h-[44px] max-h-[300px] overflow-y-auto"
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
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Run Options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 p-0 bg-popover/95 backdrop-blur-sm border-border/50 overflow-hidden shadow-2xl">
                  <div className="p-3 border-b border-border/50 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-tight">Runtime Configuration</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px] text-[11px]">
                        Override default parameters for the next execution.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="p-3">
                    <Tabs defaultValue="model" className="w-full">
                      <TabsList className="grid w-full grid-cols-5 h-8 bg-muted/30 p-1">
                        <TabsTrigger value="model" className="text-[9px] px-0">Model</TabsTrigger>
                        <TabsTrigger value="small_model" className="text-[9px] px-0">Small</TabsTrigger>
                        <TabsTrigger value="analyst" className="text-[9px] px-0">Analyst</TabsTrigger>
                        <TabsTrigger value="validator" className="text-[9px] px-0">Validator</TabsTrigger>
                        <TabsTrigger value="specialist" className="text-[9px] px-0">Config</TabsTrigger>
                      </TabsList>
                      <TabsContent value="model">{renderLLMConfig('model')}</TabsContent>
                      <TabsContent value="small_model">{renderLLMConfig('small_model')}</TabsContent>
                      <TabsContent value="analyst">{renderLLMConfig('analyst')}</TabsContent>
                      <TabsContent value="validator">{renderLLMConfig('config_validator')}</TabsContent>
                      <TabsContent value="specialist">{renderLLMConfig('databus_specialist')}</TabsContent>
                    </Tabs>

                    <div className="mt-4 pt-3 border-t border-border/50 grid gap-3">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Recursion Limit</Label>
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {overrideConfig.recursionLimit || config.recursionLimit || 100}
                          </span>
                        </div>
                        <Input
                          type="range"
                          min="1"
                          max="200"
                          step="1"
                          value={overrideConfig.recursionLimit || config.recursionLimit || 100}
                          onChange={(e) => setOverrideConfig(prev => ({ ...prev, recursionLimit: parseInt(e.target.value) }))}
                          className="h-4 p-0 accent-primary"
                        />
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]">Interrupt Before Tools</span>
                          <Switch
                            checked={overrideConfig.interruptBefore?.includes("tools") || false}
                            onCheckedChange={(checked) => 
                              setOverrideConfig(prev => ({
                                ...prev,
                                interruptBefore: checked ? ["tools"] : []
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]">Interrupt After Tools</span>
                          <Switch
                            checked={overrideConfig.interruptAfter?.includes("tools") || false}
                            onCheckedChange={(checked) => 
                              setOverrideConfig(prev => ({
                                ...prev,
                                interruptAfter: checked ? ["tools"] : []
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-3 w-[1px] bg-border/40" />

              <div className="flex items-center gap-4 text-muted-foreground/30">
                <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase">
                  <div className="flex items-center gap-0.5 rounded border border-border/50 bg-muted/30 px-1 py-0.5 font-mono text-[8px]">
                    <Command size={8} />
                    <span>Enter</span>
                  </div>
                  <span>Send</span>
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
                  className="h-7 gap-2 rounded-lg border-destructive/10 bg-destructive/5 text-[10px] font-bold text-destructive hover:bg-destructive/10 transition-[background-color,color,opacity,transform]"
                >
                  <Square size={10} fill="currentColor" />
                  STOP CORE
                </Button>
              ) : (
                <Button
                  onClick={() => hasInput && onSubmit()}
                  size="icon"
                  disabled={submitDisabled || !hasInput}
                  className={cn(
                    "h-8 w-8 rounded-xl transition-[background-color,border-color,color,transform,opacity] duration-500",
                    hasInput 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-110 active:scale-90" 
                      : "bg-muted text-muted-foreground/20 opacity-30"
                  )}
                >
                  <ArrowUp size={16} strokeWidth={3} />
                  <span className="sr-only">Send</span>
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
