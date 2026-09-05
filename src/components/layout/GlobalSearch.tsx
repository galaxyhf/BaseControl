"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, Search, Server } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useServers } from "@/hooks/use-data";
import { useApp } from "@/components/shared/Providers";
import { fetchApi } from "@/lib/client";
import type { ServerSnapshot } from "@/lib/database/types";
import { formatBytes } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { QueryError, TableSkeleton } from "@/components/shared/QueryState";
export const GlobalSearch = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) => {
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(false);
  const { configured } = useApp();
  const { data: servers = [] } = useServers();
  const {
    data: snapshots = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ["global-search"],
    queryFn: () => fetchApi<ServerSnapshot[]>("/api/databases"),
    enabled: configured && open && all,
    staleTime: 60000,
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);
  const term = search.toLowerCase();
  const matches = servers.filter((s) => `${s.name} ${s.host}`.toLowerCase().includes(term));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="px-5 pt-5 text-base">Busca global</DialogTitle>
        <DialogDescription className="px-5 pt-1 text-xs">
          Encontre servidores, hosts e databases no seu workspace.
        </DialogDescription>
        <div className="space-y-3 border-b p-5">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="O que você está procurando?"
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={all} onCheckedChange={(value) => setAll(value === true)} />
            Buscar em todos os servidores
          </label>
        </div>
        <div className="max-h-[55vh] overflow-auto p-3">
          <QueryError error={error} />
          {isFetching ? (
            <TableSkeleton />
          ) : (
            <>
              {matches.map((server) => (
                <Link
                  onClick={() => onOpenChange(false)}
                  key={server.id}
                  href={`/servers/${server.id}`}
                  className="flex items-center gap-3 rounded-md p-3 hover:bg-accent"
                >
                  <Server className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{server.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {server.host}:{server.port}
                    </p>
                  </div>
                </Link>
              ))}
              {all &&
                snapshots.map((snapshot) => (
                  <div key={snapshot.server.id}>
                    {snapshot.error ? (
                      <p className="p-3 text-xs text-warning">
                        {snapshot.server.name}: {snapshot.error}
                      </p>
                    ) : (
                      snapshot.databases
                        .filter((d) => d.name.toLowerCase().includes(term))
                        .map((database) => (
                          <Link
                            onClick={() => onOpenChange(false)}
                            key={database.name}
                            href={`/servers/${snapshot.server.id}?database=${encodeURIComponent(database.name)}`}
                            className="flex items-center gap-3 rounded-md p-3 hover:bg-accent"
                          >
                            <Database className="size-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{database.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {snapshot.server.name}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(database.size)} · {database.connections} conexões
                            </span>
                          </Link>
                        ))
                    )}
                  </div>
                ))}
              {!matches.length &&
                (!all ||
                  !snapshots.some((s) =>
                    s.databases.some((d) => d.name.toLowerCase().includes(term)),
                  )) && (
                  <EmptyState
                    icon={Search}
                    title="Nenhum resultado encontrado"
                    description="Tente outro nome ou habilite a busca em todos os servidores."
                  />
                )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
