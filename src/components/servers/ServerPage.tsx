"use client";
import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Database, Pencil, Plug, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { useServer } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { QueryError, TableSkeleton } from "@/components/shared/QueryState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DatabaseTable } from "@/components/databases/DatabaseTable";
import { ServerDialog } from "./ServerDialog";
import { fetchApi } from "@/lib/client";
import { formatBytes, formatDate } from "@/lib/utils";
export const ServerPage = ({ id, initialName }: { id: string; initialName?: string }) => {
  const [connected, setConnected] = useState(true);
  const [editing, setEditing] = useState(false);
  const { data, error, isLoading, isFetching, refetch } = useServer(id, connected);
  const server = data?.server;
  const toggleConnection = async () => {
    try {
      const result = await fetchApi<{ error?: string }>(`/api/servers/${id}/connect`, {
        method: connected ? "DELETE" : "POST",
      });
      if (result.error) throw new Error(result.error);
      setConnected(!connected);
      toast.success(connected ? "Monitoramento desconectado." : "Servidor conectado com sucesso.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  return (
    <>
      <Link
        href="/servers"
        className="mb-5 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={13} />
        Todos os servidores
      </Link>
      <PageHeader
        eyebrow={server?.type === "sqlserver" ? "Microsoft SQL Server" : "PostgreSQL"}
        title={server?.name || "Servidor"}
        description={
          server
            ? `${server.host}:${server.port} · ${server.version || "Versão não verificada"}`
            : "Carregando informações da conexão..."
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={!connected || isFetching}
        >
          <RefreshCw className={isFetching ? "animate-spin" : ""} size={14} />
          Atualizar
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={!server}>
          <Pencil size={14} />
          Editar conexão
        </Button>
        <Button variant="outline" size="sm" onClick={toggleConnection}>
          {connected ? <Unplug size={14} /> : <Plug size={14} />}
          {connected ? "Desconectar" : "Conectar"}
        </Button>
      </PageHeader>
      <QueryError error={error || (data?.error ? new Error(data.error) : null)} />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        data && (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <StatusBadge status={connected ? data.server.status : "disconnected"} />
              <span>Última atualização: {formatDate(data.server.lastUpdatedAt)}</span>
              {isFetching && <span className="text-primary">Atualizando inventário...</span>}
            </div>
            <div className="mb-7 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Databases encontradas", value: data.databases.length, icon: Database },
                {
                  label: "Armazenamento total",
                  value: formatBytes(data.databases.reduce((n, d) => n + d.size, 0)),
                  icon: Database,
                },
                {
                  label: "Conexões ativas",
                  value: data.databases.reduce((n, d) => n + d.connections, 0),
                  icon: Activity,
                },
              ].map((stat) => (
                <Card key={stat.label} className="gap-3 p-5 shadow-none">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {stat.label}
                    <stat.icon size={16} />
                  </div>
                  <p className="font-mono text-2xl">{stat.value}</p>
                </Card>
              ))}
            </div>
            <h2 className="mb-4 text-base font-semibold">Databases</h2>
            {connected ? (
              <DatabaseTable
                key={id}
                databases={data.databases}
                server={data.server}
                initialName={initialName}
              />
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Monitoramento pausado. Conecte o servidor para consultar e administrar databases.
              </Card>
            )}
          </>
        )
      )}
      {editing && server && <ServerDialog open onOpenChange={setEditing} server={server} />}
    </>
  );
};
