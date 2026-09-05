"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { QueryError, TableSkeleton } from "@/components/shared/QueryState";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useApp } from "@/components/shared/Providers";
import { fetchApi } from "@/lib/client";
import type { ServerSnapshot } from "@/lib/database/types";
import { DatabaseTable } from "./DatabaseTable";
export const DatabasesPage = () => {
  const { configured } = useApp();
  const [search, setSearch] = useState("");
  const {
    data = [],
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["all-databases"],
    queryFn: () => fetchApi<ServerSnapshot[]>("/api/databases"),
    enabled: configured,
    staleTime: 60000,
  });
  const matches = data.map((snapshot) => ({
    ...snapshot,
    databases: snapshot.databases.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase()),
    ),
  }));
  return (
    <>
      <PageHeader
        eyebrow="Inventário global"
        title="Databases"
        description="Encontre e administre databases agrupadas por servidor."
      >
        <Button variant="outline" onClick={() => refetch()} disabled={!configured || isFetching}>
          <RefreshCw className={isFetching ? "animate-spin" : ""} size={14} />
          {isFetching ? "Consultando servidores..." : "Atualizar todos"}
        </Button>
      </PageHeader>
      <div className="relative mb-6 max-w-lg">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          className="bg-card pl-9"
          placeholder="Buscar database em todos os servidores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <QueryError error={error} />
      {isFetching ? (
        <TableSkeleton />
      ) : !data.length ? (
        <Card className="py-0 shadow-none">
          <EmptyState
            title="Nenhuma database encontrada"
            description="Adicione um servidor e conecte para consultar seu inventário."
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {matches
            .filter((s) => s.databases.length || s.error || !search)
            .map((snapshot) => (
              <section key={snapshot.server.id}>
                <div className="mb-3 flex items-center gap-2.5">
                  <Server className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{snapshot.server.name}</h2>
                  <StatusBadge status={snapshot.server.status} />
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {snapshot.databases.length} databases
                  </span>
                </div>
                <QueryError error={snapshot.error ? new Error(snapshot.error) : null} />
                {!snapshot.error && (
                  <DatabaseTable databases={snapshot.databases} server={snapshot.server} />
                )}
              </section>
            ))}
          {search && !matches.some((s) => s.databases.length) && (
            <EmptyState
              title="Nenhuma database corresponde aos filtros selecionados"
              description="Tente outro nome de database."
            />
          )}
        </div>
      )}
    </>
  );
};
