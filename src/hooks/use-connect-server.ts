"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fetchApi } from "@/lib/client";
import type { ServerSnapshot } from "@/lib/database/types";
export const useConnectServer = () => {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<ServerSnapshot>(`/api/servers/${id}/connect`, { method: "POST" }),
    onSuccess: async (snapshot, id) => {
      client.setQueryData(["server", id], snapshot);
      await client.invalidateQueries({ queryKey: ["servers"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      if (snapshot.error) toast.error(snapshot.error);
      else toast.success("Servidor conectado com sucesso.");
      router.push(`/servers/${id}`);
    },
    onError: (error) => toast.error(error.message),
  });
};
