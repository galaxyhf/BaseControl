"use client";
import { useQuery } from "@tanstack/react-query";
import { Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { QueryError, TableSkeleton } from "@/components/shared/QueryState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApp } from "@/components/shared/Providers";
import { fetchApi } from "@/lib/client";
import type { OperationRecord } from "@/lib/database/types";
import { OperationCard } from "./OperationCard";
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
