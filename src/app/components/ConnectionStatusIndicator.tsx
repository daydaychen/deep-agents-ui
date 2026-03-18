"use client";

import { useConnectionStatus } from "@/app/hooks/useConnectionStatus";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";

// Static icon components - hoisted outside to avoid recreation on every render
const ConnectedIcon = <Activity className="h-4 w-4 text-emerald-500" />;
const DisconnectedIcon = <Activity className="h-4 w-4 text-destructive" />;
const ConnectingIcon = (
  <Activity className="h-4 w-4 animate-pulse text-yellow-500" />
);
const ErrorIcon = <Activity className="h-4 w-4 text-destructive" />;

export function ConnectionStatusIndicator() {
  const { status } = useConnectionStatus();
  const t = useTranslations("connection");

  const statusMap = {
    connected: {
      icon: ConnectedIcon,
      color: "bg-emerald-500",
      text: t("connected"),
    },
    disconnected: {
      icon: DisconnectedIcon,
      color: "bg-destructive",
      text: t("disconnected"),
    },
    connecting: {
      icon: ConnectingIcon,
      color: "bg-yellow-500",
      text: t("connecting"),
    },
    error: {
      icon: ErrorIcon,
      color: "bg-destructive",
      text: t("error"),
    },
  };

  const current = statusMap[status] || statusMap.disconnected;

  return (
    <div className="flex cursor-default items-center gap-2 px-2 py-1">
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
  );
}
