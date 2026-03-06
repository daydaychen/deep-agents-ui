"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StandaloneConfig } from "@/lib/config";
import { toast } from "sonner";
import { Settings2, Key, Hash, User } from "lucide-react";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StandaloneConfig) => void;
  initialConfig?: StandaloneConfig;
}

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: ConfigDialogProps) {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || "");
  const [model, setModel] = useState(initialConfig?.model || "");
  const [maxTurns, setMaxTurns] = useState(
    initialConfig?.maxTurns?.toString() || ""
  );
  const [userId, setUserId] = useState(initialConfig?.userId || "");

  useEffect(() => {
    if (open && initialConfig) {
      setApiKey(initialConfig.apiKey || "");
      setModel(initialConfig.model || "");
      setMaxTurns(initialConfig.maxTurns?.toString() || "");
      setUserId(initialConfig.userId || "");
    }
  }, [open, initialConfig]);

  const handleSave = () => {
    if (!apiKey) {
      toast.error("API Key is required");
      return;
    }

    const parsedMaxTurns = maxTurns ? parseInt(maxTurns, 10) : undefined;
    if (maxTurns && (isNaN(parsedMaxTurns!) || parsedMaxTurns! < 1)) {
      toast.error("Max turns must be a positive number");
      return;
    }

    onSave({
      apiKey,
      model: model || undefined,
      maxTurns: parsedMaxTurns,
      userId: userId || undefined,
    });
    toast.success("Settings saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <DialogTitle>Configuration</DialogTitle>
          </div>
          <DialogDescription>
            Configure your API settings for Databus Pilot.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey" className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-muted/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model" className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                Model{" "}
                <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider ml-1">
                  (Optional)
                </span>
              </Label>
              <Input
                id="model"
                placeholder="claude-sonnet-4-20250514"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxTurns" className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                Max Turns{" "}
                <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider ml-1">
                  (Optional)
                </span>
              </Label>
              <Input
                id="maxTurns"
                type="number"
                min="1"
                placeholder="100"
                value={maxTurns}
                onChange={(e) => setMaxTurns(e.target.value)}
                className="bg-muted/30"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="userId" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              User ID{" "}
              <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider ml-1">
                (Optional)
              </span>
            </Label>
            <Input
              id="userId"
              placeholder="user-identifier"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-muted/30"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="px-8">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
