"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Copy, History, Timer, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { QueryError, TableSkeleton } from "@/components/shared/QueryState";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useApp } from "@/components/shared/Providers";
import { fetchApi } from "@/lib/client";
import type { OperationRecord } from "@/lib/database/types";
import { formatDate } from "@/lib/utils";
const OperationCard = ({ operation }: { operation: OperationRecord }) => {
  const active = ["pending", "running"].includes(operation.status);
  const [expanded, setExpanded] = useState(active);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  const duration = Math.max(
    0,
    Math.floor(
      ((operation.finishedAt ? new Date(operation.finishedAt).getTime() : now) -
        new Date(operation.createdAt).getTime()) /
        1000,
    ),
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(operation, null, 2));
      toast.success("Resultado copiado.");
    } catch {
      toast.error("Não foi possível copiar o resultado.");
    }
  };
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg border bg-muted/40">
            <Workflow className="size-5 text-primary" />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">
              {operation.action === "DROP_DATABASE"
                ? "Exclusão de databases"
                : "Encerramento de conexões"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {operation.serverName} · {formatDate(operation.createdAt)}
            </p>
          </div>
          <StatusBadge status={operation.status} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>
            {operation.completed} de {operation.total} processadas ·{" "}
            {operation.total - operation.completed} restantes · {operation.failed} falhas
          </span>
          <span className="flex items-center gap-1">
            <Timer size={12} />
            {duration}s
          </span>
        </div>
        <Progress
          value={operation.total ? (operation.completed / operation.total) * 100 : 0}
          className="mt-2 h-1.5"
        />
        <div className="mt-4 flex items-center justify-between">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Fechar detalhes" : "Ver detalhes"}
            <ChevronDown className={`size-3 ${expanded ? "rotate-180" : ""}`} />
          </button>
          {!active && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={copy}>
                <Copy size={12} />
                Copiar resultado
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" asChild>
                <Link href="/audit">
                  <History size={12} />
                  Ver auditoria
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="divide-y border-t bg-muted/15">
          {operation.items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3">
              <CheckCircle2
                className={`mt-0.5 size-4 ${item.status === "success" ? "text-success" : "text-muted-foreground"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-xs">{item.databaseName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.message || "Aguardando processamento..."}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
export const OperationsPage = () => {
  const { configured } = useApp();
  const {
    data = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["operations"],
    queryFn: () => fetchApi<OperationRecord[]>("/api/operations"),
    enabled: configured,
  });
  const active = data.filter((o) => ["pending", "running"].includes(o.status));
  const previous = data.filter((o) => !["pending", "running"].includes(o.status));
  return (
    <>
      <PageHeader
        eyebrow="Execução e acompanhamento"
        title="Operações"
        description="Acompanhe o progresso e o resultado de cada operação administrativa."
      />
      <QueryError error={error} />
      <Tabs defaultValue="all">
        <TabsList className="mb-5">
          <TabsTrigger value="all">Todas ({data.length})</TabsTrigger>
          <TabsTrigger value="active">Em andamento ({active.length})</TabsTrigger>
          <TabsTrigger value="previous">Anteriores ({previous.length})</TabsTrigger>
        </TabsList>
        {[
          { key: "all", list: data },
          { key: "active", list: active },
          { key: "previous", list: previous },
        ].map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {isLoading ? (
              <TableSkeleton />
            ) : tab.list.length ? (
              <div className="space-y-4">
                {tab.list.map((operation) => (
                  <OperationCard key={operation.id} operation={operation} />
                ))}
              </div>
            ) : (
              <Card className="py-0 shadow-none">
                <EmptyState
                  icon={Workflow}
                  title={
                    tab.key === "active"
                      ? "Nenhuma operação em andamento"
                      : "Nenhuma operação registrada"
                  }
                  description="As operações de exclusão e encerramento de conexões aparecerão aqui, com progresso em tempo real."
                />
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
};
