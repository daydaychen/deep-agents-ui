"use client";

import { useConnectionStatus } from "@/app/hooks/useConnectionStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";

export function ConnectionStatusIndicator() {
  const { status } = useConnectionStatus();
  const t = useTranslations("connection");

  const statusMap = {
    connected: {
      icon: <Activity className="h-4 w-4 text-emerald-500" />,
      color: "bg-emerald-500",
      text: t("connected"),
    },
    disconnected: {
      icon: <Activity className="h-4 w-4 text-destructive" />,
      color: "bg-destructive",
      text: t("disconnected"),
    },
    connecting: {
      icon: <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />,
      color: "bg-yellow-500",
      text: t("connecting"),
    },
    error: {
      icon: <Activity className="h-4 w-4 text-destructive" />,
      color: "bg-destructive",
      text: t("error"),
    },
  };

  const current = statusMap[status] || statusMap.disconnected;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1 cursor-default">
          <div className="relative">
            {current.icon}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background",
                current.color
              )}
            />
          </div>
          <span className="hidden text-xs font-medium text-muted-foreground md:inline-block">
            {current.text}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{current.text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
