"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Database,
  Layers3,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerDialog } from "@/components/servers/ServerDialog";
import { ServerCard } from "@/components/servers/ServerCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { QueryError } from "@/components/shared/QueryState";
import { useApp } from "@/components/shared/Providers";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fetchApi } from "@/lib/client";
import { usePreferences } from "@/hooks/use-data";
import type { OperationRecord, SavedServer } from "@/lib/database/types";
import { formatDate } from "@/lib/utils";
export const Dashboard = () => {
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { configured } = useApp();
  const client = useQueryClient();
  const { data: prefs } = usePreferences();
  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      fetchApi<{ servers: SavedServer[]; operationsToday: number }>(
        `/api/dashboard${prefs?.refreshInterval ? "?refresh=true" : ""}`,
      ),
    enabled: configured,
    refetchInterval: prefs?.refreshInterval ? prefs.refreshInterval * 1000 : false,
  });
  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => fetchApi<OperationRecord[]>("/api/operations"),
    enabled: configured,
  });
  const servers = data?.servers || [];
  const databases = servers.reduce((sum, s) => sum + s.databaseCount, 0);
  const online = servers.filter((s) => s.status === "online").length;
  const stats = [
    { label: "Servidores", value: servers.length, icon: Server, note: `${online} online` },
    { label: "Databases", value: databases, icon: Database, note: "Em todos os servidores" },
    {
      label: "PostgreSQL",
      value: servers.filter((s) => s.type === "postgres").reduce((n, s) => n + s.databaseCount, 0),
      icon: Layers3,
      note: "Databases PostgreSQL",
    },
    {
      label: "SQL Server",
      value: servers.filter((s) => s.type === "sqlserver").reduce((n, s) => n + s.databaseCount, 0),
      icon: Layers3,
      note: "Databases SQL Server",
    },
    {
      label: "Conexões ativas",
      value: servers.filter((s) => s.status === "online").reduce((n, s) => n + s.connections, 0),
      icon: Activity,
      note: "Última consulta",
    },
    {
      label: "Operações hoje",
      value: data?.operationsToday || 0,
      icon: Workflow,
      note: "Horário de Brasília",
    },
  ];
  const refresh = async () => {
    if (!configured) return;
    setRefreshing(true);
    try {
      await fetchApi("/api/databases");
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await client.invalidateQueries({ queryKey: ["servers"] });
      toast.success("Dados atualizados.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Visão geral da infraestrutura"
        title="Dashboard"
        description="Seus servidores, databases e operações. Tudo em um só lugar."
      >
        <Button variant="outline" disabled={!configured || refreshing} onClick={refresh}>
          <RefreshCw className={refreshing ? "animate-spin" : ""} size={14} />
          {refreshing ? "Atualizando..." : "Atualizar"}
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} />
          Adicionar servidor
        </Button>
      </PageHeader>
      <QueryError error={error} />
      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-0 p-4 shadow-none">
            <div className="mb-5 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className="size-4 text-muted-foreground/70" strokeWidth={1.6} />
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="font-mono text-[28px] leading-9 tracking-tight">
                {stat.value.toLocaleString("pt-BR")}
              </p>
            )}
            <p className="mt-3 text-[10px] text-muted-foreground">{stat.note}</p>
          </Card>
        ))}
      </div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold tracking-tight">Seus servidores</h2>
          <span className="rounded-md border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {servers.length}
          </span>
        </div>
        <Link
          href="/servers"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          Ver todos os servidores <ArrowRight size={13} />
        </Link>
      </div>
      {servers.length > 0 ? (
        <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {servers.slice(0, 6).map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      ) : (
        <Card className="mb-7 gap-0 overflow-hidden py-0 shadow-none">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex gap-5 text-xs">
              <span className="font-medium text-primary">Todos os servidores</span>
              <span className="text-muted-foreground">PostgreSQL</span>
              <span className="text-muted-foreground">SQL Server</span>
            </div>
            <span className="hidden text-[10px] text-muted-foreground sm:block">
              Inventário de infraestrutura
            </span>
          </div>
          <EmptyState
            icon={Server}
            title="Sua infraestrutura começa aqui"
            description="Adicione seu primeiro servidor PostgreSQL ou SQL Server para visualizar databases, acompanhar conexões e administrar com segurança."
          >
            <Button onClick={() => setAdding(true)}>
              <Plus size={15} />
              Adicionar primeiro servidor
            </Button>
          </EmptyState>
          <div className="flex flex-wrap items-center justify-center gap-5 border-t bg-muted/20 py-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} />
              Credenciais criptografadas
            </span>
            <span className="flex items-center gap-1.5">
              <Activity size={12} />
              Monitoramento centralizado
            </span>
            <span className="flex items-center gap-1.5">
              <Workflow size={12} />
              Auditoria de operações
            </span>
          </div>
        </Card>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card className="gap-0 py-0 shadow-none">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Operações recentes</h2>
            <Link
              href="/operations"
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              Ver histórico <ArrowRight size={12} />
            </Link>
          </div>
          {operations.length ? (
            <div className="divide-y">
              {operations.slice(0, 4).map((operation) => (
                <Link
                  href="/operations"
                  key={operation.id}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30"
                >
                  <span className="rounded-md border p-2">
                    <Workflow className="size-4 text-muted-foreground" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      {operation.action === "DROP_DATABASE"
                        ? "Exclusão de databases"
                        : "Encerramento de conexões"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {operation.serverName} · {formatDate(operation.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={operation.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Workflow}
              title="Nenhuma operação realizada"
              description="As atividades administrativas aparecerão aqui."
            />
          )}
        </Card>
        <Card className="gap-0 py-0 shadow-none">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Distribuição da infraestrutura</h2>
          </div>
          <div className="space-y-6 p-5">
            {(["postgres", "sqlserver"] as const).map((type) => {
              const total = servers
                .filter((s) => s.type === type)
                .reduce((n, s) => n + s.databaseCount, 0);
              return (
                <div key={type}>
                  <div className="mb-3 flex items-center gap-2">
                    <Database className="size-4 text-primary" />
                    <span className="text-xs font-medium">
                      {type === "postgres" ? "PostgreSQL" : "SQL Server"}
                    </span>
                    <span className="ml-auto font-mono text-xs">
                      {total}
                      <span className="ml-1.5 font-sans text-[10px] text-muted-foreground">
                        databases
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${databases ? (total / databases) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t pt-5 text-xs">
              <span className="text-muted-foreground">Servidores disponíveis</span>
              <span className="font-mono">
                {online} <span className="text-muted-foreground">/ {servers.length}</span>
              </span>
            </div>
            <p className="text-[10px] leading-5 text-muted-foreground">
              Os indicadores refletem a última consulta aos servidores. Atualize para obter uma nova
              leitura.
            </p>
          </div>
        </Card>
      </div>
      {adding && <ServerDialog open onOpenChange={setAdding} />}
    </>
  );
};
