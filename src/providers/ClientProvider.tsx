"use client";

import { Client } from "@langchain/langgraph-sdk";
import { ReactNode, useMemo } from "react";
import { ClientContext } from "./client-context";

interface ClientProviderProps {
  children: ReactNode;
  deploymentUrl: string;
}

export function ClientProvider({ children, deploymentUrl }: ClientProviderProps) {
  const client = useMemo(() => {
    return new Client({
      apiUrl: deploymentUrl,
      defaultHeaders: {
        "Content-Type": "application/json",
      },
    });
  }, [deploymentUrl]);

  const value = useMemo(() => ({ client }), [client]);

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}
