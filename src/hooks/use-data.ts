"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/components/shared/Providers";
import { fetchApi } from "@/lib/client";
import type { OperationRecord, SavedServer, ServerSnapshot } from "@/lib/database/types";
export interface Preferences {
  refreshInterval: 0 | 15 | 30 | 60 | 300;
  theme: "system" | "light" | "dark";
}
export const usePreferences = () => {
  const { configured } = useApp();
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchApi<Preferences>("/api/settings"),
    enabled: configured,
    staleTime: 60000,
  });
};
export const useServers = () => {
  const { configured } = useApp();
  const { data: prefs } = usePreferences();
  return useQuery({
    queryKey: ["servers"],
    queryFn: () => fetchApi<SavedServer[]>("/api/servers"),
    enabled: configured,
    refetchInterval: prefs?.refreshInterval ? prefs.refreshInterval * 1000 : false,
  });
};
export const useServer = (id: string, connected = true) => {
  const { configured } = useApp();
  const { data: prefs } = usePreferences();
  return useQuery({
    queryKey: ["server", id],
    queryFn: () => fetchApi<ServerSnapshot>(`/api/servers/${id}`),
    enabled: configured && !!id && connected,
    refetchInterval: connected && prefs?.refreshInterval ? prefs.refreshInterval * 1000 : false,
  });
};
export const useOperations = () => {
  const { configured } = useApp();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["operations"],
    queryFn: () => fetchApi<OperationRecord[]>("/api/operations"),
    enabled: configured,
    staleTime: 5000,
  });
  useEffect(() => {
    if (!configured) return;
    const source = new EventSource("/api/events");
    source.addEventListener("operations", (event) => {
      const data: OperationRecord[] = JSON.parse(event.data);
      const previous = client.getQueryData<OperationRecord[]>(["operations"]);
      client.setQueryData(["operations"], data);
      if (
        data.some(
          (row) =>
            ["success", "failed", "partial"].includes(row.status) &&
            previous?.find((p) => p.id === row.id)?.status !== row.status,
        )
      ) {
        for (const key of ["servers", "server", "dashboard", "database", "audit"])
          void client.invalidateQueries({ queryKey: [key] });
      }
    });
    return () => source.close();
  }, [configured, client]);
  return query;
};
