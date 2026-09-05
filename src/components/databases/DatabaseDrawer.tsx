"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, ShieldCheck, Unplug } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { QueryError, TableSkeleton } from "@/components/shared/QueryState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { DatabaseDetails, DatabaseInfo, SavedServer } from "@/lib/database/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { fetchApi } from "@/lib/client";
import { OperationDialog, type OperationTarget } from "./OperationDialog";
import { usePreferences } from "@/hooks/use-data";
export const DatabaseDrawer = ({
  database,
  server,
  close,
}: {
  database: DatabaseInfo;
  server: SavedServer;
  close: () => void;
}) => {
  const { data: prefs } = usePreferences();
  const [target, setTarget] = useState<OperationTarget>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["database", server.id, database.name],
    queryFn: () =>
      fetchApi<DatabaseDetails>(
        `/api/servers/${server.id}/databases/${encodeURIComponent(database.name)}`,
      ),
    refetchInterval: prefs?.refreshInterval ? prefs.refreshInterval * 1000 : false,
  });
  return (
    <>
      <Sheet open onOpenChange={(v) => !v && close()}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-[760px]">
          <SheetHeader className="border-b p-6">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Database size={15} />
              Detalhes da database
            </div>
            <SheetTitle className="break-all font-mono text-xl">{database.name}</SheetTitle>
            <SheetDescription>
              {server.name} · {server.type === "postgres" ? "PostgreSQL" : "SQL Server"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 p-6">
            <div className="flex gap-2">
              <StatusBadge status={database.status} />
              {database.isSystem && (
                <Badge variant="outline">
                  <ShieldCheck size={12} />
                  Sistema
                </Badge>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-lg border bg-muted/20 p-4">
              {[
                ["Owner", database.owner || "—"],
                ["Tamanho", formatBytes(data?.size ?? database.size)],
                ["Conexões ativas", String(data?.connections ?? database.connections)],
                ["Data de criação", formatDate(database.createdAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="mt-1.5 break-all text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <QueryError error={error} />
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <Tabs defaultValue="connections">
                <TabsList className="mb-3">
                  <TabsTrigger value="connections">
                    Conexões ativas ({data?.sessions.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="tables">
                    Tamanho das tabelas ({data?.tables.length || 0})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="connections">
                  {data?.sessions.length ? (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {["ID / Usuário", "Host / Aplicação", "Status / Tempo", ""].map(
                              (h, i) => (
                                <TableHead key={i}>{h}</TableHead>
                              ),
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.sessions.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell>
                                <p className="font-mono text-xs">{session.id}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {session.username}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-xs">{session.host}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {session.application || "—"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-xs">{session.status}</p>
                                <p className="mt-1 font-mono text-xs text-muted-foreground">
                                  {session.duration}s
                                </p>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={database.isSystem}
                                  aria-label={`Encerrar sessão ${session.id}`}
                                  onClick={() =>
                                    setTarget({
                                      action: "TERMINATE_SESSION",
                                      databases: [database],
                                      session,
                                    })
                                  }
                                >
                                  <Unplug size={15} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <EmptyState
                      title="Nenhuma conexão ativa"
                      description="Não há sessões disponíveis nesta database."
                    />
                  )}
                  <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
                    O texto SQL das sessões é omitido para evitar a exposição de senhas, tokens e
                    dados sensíveis presentes em queries.
                  </p>
                </TabsContent>
                <TabsContent value="tables">
                  {data?.tables.length ? (
                    <>
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {["Tabela", "Linhas ≈", "Dados", "Índices", "Total"].map((h) => (
                                <TableHead key={h}>{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.tables.map((table) => (
                              <TableRow key={`${table.schema}.${table.name}`}>
                                <TableCell className="font-mono text-xs">
                                  {table.schema}.{table.name}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {table.rows.toLocaleString("pt-BR")}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {formatBytes(table.dataSize)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {formatBytes(table.indexSize)}
                                </TableCell>
                                <TableCell className="text-xs font-medium">
                                  {formatBytes(table.totalSize)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Contagens de linhas aproximadas a partir das estatísticas do servidor.
                      </p>
                    </>
                  ) : (
                    <EmptyState
                      title="Nenhuma tabela encontrada"
                      description="Tabelas de usuário serão listadas com seus tamanhos de dados e índices."
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {target && (
        <OperationDialog target={target} serverId={server.id} close={() => setTarget(undefined)} />
      )}
    </>
  );
};
