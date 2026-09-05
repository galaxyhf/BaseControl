"use client";
import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Plus, Search, Server } from "lucide-react";
import { useServers } from "@/hooks/use-data";
import { useConnectServer } from "@/hooks/use-connect-server";
import type { SavedServer } from "@/lib/database/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { QueryError, TableSkeleton } from "@/components/shared/QueryState";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ServerCard } from "./ServerCard";
import { ServerDialog } from "./ServerDialog";
import { RemoveServerDialog } from "./RemoveServerDialog";
import { cn, formatDate } from "@/lib/utils";
export const ServersPage = () => {
  const connect = useConnectServer();
  const { data: servers = [], error, isLoading } = useServers();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [grid, setGrid] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SavedServer>();
  const [removing, setRemoving] = useState<SavedServer>();
  const filtered = servers.filter(
    (s) =>
      `${s.name} ${s.host}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || s.type === filter || s.status === filter),
  );
  return (
    <>
      <PageHeader
        eyebrow="Conexões e infraestrutura"
        title="Servidores"
        description="Gerencie conexões e acompanhe a disponibilidade dos seus servidores."
      >
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} />
          Adicionar servidor
        </Button>
      </PageHeader>
      <QueryError error={error} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-1 overflow-auto rounded-lg border bg-card p-1">
          {[
            { key: "all", label: "Todos" },
            { key: "postgres", label: "PostgreSQL" },
            { key: "sqlserver", label: "SQL Server" },
            { key: "online", label: "Online" },
            { key: "offline", label: "Offline" },
          ].map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant="ghost"
              className={cn("h-8 text-xs", filter === f.key && "bg-muted text-foreground")}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="h-9 w-56 bg-card pl-9 text-xs"
              placeholder="Buscar servidor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setGrid(!grid)}
            aria-label={grid ? "Exibir tabela" : "Exibir cards"}
          >
            {grid ? <List size={16} /> : <LayoutGrid size={16} />}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : !filtered.length ? (
        <Card className="py-0 shadow-none">
          <EmptyState
            icon={Server}
            title={servers.length ? "Nenhum servidor encontrado" : "Nenhum servidor cadastrado"}
            description={
              servers.length
                ? "Altere a busca ou os filtros selecionados."
                : "Adicione seu primeiro servidor PostgreSQL ou SQL Server."
            }
          >
            {!servers.length && (
              <Button onClick={() => setAdding(true)}>
                <Plus size={15} />
                Adicionar servidor
              </Button>
            )}
          </EmptyState>
        </Card>
      ) : grid ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onEdit={() => setEditing(server)}
              onRemove={() => setRemoving(server)}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden py-0 shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Nome",
                  "Tipo",
                  "Host / porta",
                  "Status",
                  "Databases",
                  "Conexões",
                  "Última conexão",
                  "Ações",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">
                    <Link href={`/servers/${server.id}`}>{server.name}</Link>
                  </TableCell>
                  <TableCell>{server.type === "postgres" ? "PostgreSQL" : "SQL Server"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {server.host}:{server.port}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={server.status} />
                  </TableCell>
                  <TableCell>{server.databaseCount}</TableCell>
                  <TableCell>{server.connections}</TableCell>
                  <TableCell className="text-xs">{formatDate(server.lastConnectedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={connect.isPending}
                        onClick={() => connect.mutate(server.id)}
                      >
                        Conectar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(server)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setRemoving(server)}
                      >
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {adding && <ServerDialog open onOpenChange={setAdding} />}
      {editing && (
        <ServerDialog
          key={editing.id}
          open
          onOpenChange={(v) => !v && setEditing(undefined)}
          server={editing}
        />
      )}
      {removing && <RemoveServerDialog server={removing} close={() => setRemoving(undefined)} />}
    </>
  );
};
