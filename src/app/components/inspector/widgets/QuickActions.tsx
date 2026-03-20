"use client";

import { Download, Play, PlayCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useCallback } from "react";
import { toast } from "sonner";
import { downloadFile } from "@/app/utils/download";
import { Button } from "@/components/ui/button";
import { useInspector } from "../inspector-context";

export const QuickActions = React.memo(() => {
  const { state, onSendMessage } = useInspector();
  const t = useTranslations("inspector");

  const hasConfig = !!state.configData.current;
  const isValid = state.validationResult?.valid === true;

  const handleExport = useCallback(() => {
    if (!state.configData.current) return;
    const json = JSON.stringify(state.configData.current, null, 2);
    downloadFile(json, `${state.configData.taskName || "config"}.json`, "application/json");
    toast.success(t("actions.exportJSON"));
  }, [state.configData.current, state.configData.taskName, t]);

  const handleValidate = useCallback(() => {
    if (onSendMessage) {
      onSendMessage(t("actions.validateCommand"));
    }
  }, [onSendMessage, t]);

  const handleRunTest = useCallback(() => {
    if (onSendMessage) {
      onSendMessage(t("actions.runTestCommand"));
    }
  }, [onSendMessage, t]);

  const handleStartTask = useCallback(() => {
    if (onSendMessage) {
      onSendMessage(t("actions.startTaskCommand"));
    }
  }, [onSendMessage, t]);

  if (!hasConfig && !onSendMessage) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-t border-border/50 px-3 py-2">
      {hasConfig && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Download className="h-3 w-3" />
          {t("actions.exportJSON")}
        </Button>
      )}
      {onSendMessage && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleValidate}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="h-3 w-3" />
            {t("actions.validate")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunTest}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Play className="h-3 w-3" />
            {t("actions.runTest")}
          </Button>
          {isValid && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartTask}
              className="h-7 gap-1.5 px-2 text-xs text-[var(--color-success)] hover:text-[var(--color-success)]"
            >
              <PlayCircle className="h-3 w-3" />
              {t("actions.startTask")}
            </Button>
          )}
        </>
      )}
    </div>
  );
});

QuickActions.displayName = "QuickActions";
