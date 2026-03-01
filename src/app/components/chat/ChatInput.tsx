"use client";

import { Button } from "@/components/ui/button";
import { ArrowUp, Square, Command, Sparkles, Zap, Brain, SlidersHorizontal, Info } from "lucide-react";
import React, { FormEvent, useCallback, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useChatState, useChatActions } from "@/providers/chat-context";
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
      { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", icon: <Sparkles className="h-3 w-3 text-orange-500" /> },
      { id: "gpt-4o", name: "GPT-4o", icon: <Zap className="h-3 w-3 text-green-500" /> },
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", icon: <Brain className="h-3 w-3 text-blue-500" /> },
    ];

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
                <DropdownMenuContent align="start" className="w-64 p-3 bg-popover/95 backdrop-blur-sm border-border/50">
                  <DropdownMenuLabel className="px-1 pb-2 flex items-center justify-between">
                    <span className="text-xs">Runtime Overrides</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px] text-[11px]">
                        These settings override assistant defaults for the next run.
                      </TooltipContent>
                    </Tooltip>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mb-3" />
                  
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        Model Provider
                      </Label>
                      <Select
                        value={overrideConfig.model || models[0].id}
                        onValueChange={(val) => setOverrideConfig(prev => ({ ...prev, model: val }))}
                      >
                        <SelectTrigger className="h-8 text-xs bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Recursion Limit
                        </Label>
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

                    <div className="grid gap-3">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Node Interruptions
                      </Label>
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
