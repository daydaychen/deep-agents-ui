"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useClient } from "@/providers/client-context";

export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

export function useConnectionStatus() {
  const client = useClient();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const { data, error, isValidating } = useSWR(
    client ? "connection-status" : null,
    async () => {
      try {
        // Simple call to check if the server is responsive
        await client.assistants.search({ limit: 1 });
        return true;
      } catch (err) {
        console.error("Connection check failed:", err);
        throw err;
      }
    },
    {
      refreshInterval: 10000, // Check every 10 seconds
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      dedupingInterval: 5000,
    },
  );

  useEffect(() => {
    if (error) {
      setStatus("disconnected");
    } else if (data) {
      setStatus("connected");
    } else if (isValidating) {
      // Keep previous status or show connecting if it's the first time
      if (status === "connecting") {
        setStatus("connecting");
      }
    }
  }, [data, error, isValidating, status]);

  return { status, lastChecked: new Date() };
}
