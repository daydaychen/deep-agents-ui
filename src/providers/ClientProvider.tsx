"use client";

import { Client } from "@langchain/langgraph-sdk";
import { ReactNode, useMemo } from "react";
import { ClientContext } from "./client-context";

interface ClientProviderProps {
  children: ReactNode;
}

function getProxyUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/langgraph`;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const client = useMemo(() => {
    const proxyUrl = getProxyUrl();
    return new Client({
      apiUrl: proxyUrl,
      apiKey: null,
      defaultHeaders: {
        "Content-Type": "application/json",
      },
    });
  }, []);

  const value = useMemo(() => ({ client }), [client]);

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}
