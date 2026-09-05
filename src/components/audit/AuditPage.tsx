"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useApp } from "@/components/shared/Providers";
import { fetchApi } from "@/lib/client";
import type { AuditRecord } from "@/lib/database/types";
import { formatDate } from "@/lib/utils";
const actions = [
  "CONNECT",
  "TEST_CONNECTION",
  "TERMINATE_SESSION",
  "TERMINATE_DATABASE_CONNECTIONS",
  "DROP_DATABASE",
  "DROP_DATABASE_BATCH",
  "CREATE_SERVER",
  "UPDATE_SERVER",
  "REMOVE_SERVER",
  "DISCONNECT",
];
export const AuditPage = () => {
  const { configured } = useApp();
  const [filters, setFilters] = useState({
    server: "",
    database: "",
    user: "",
    from: "",
    to: "",
    action: "all",
    status: "all",
  });
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(0);
  const {
    data = [],
    error,
    isFetching,
  } = useQuery({
    queryKey: ["audit", applied, page],
    queryFn: () => fetchApi<AuditRecord[]>(`/api/audit?${applied}&page=${page}`),
    enabled: configured,
  });
  const apply = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    setApplied(params.toString());
    setPage(0);
  };
  return (
    <>
      <PageHeader
        eyebrow="Rastreabilidade e segurança"
        title="Auditoria"
        description="Histórico das ações administrativas, com usuário, resultado e duração."
      />
      <Card className="mb-5 gap-4 p-4 shadow-none">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            ["server", "Servidor", "Nome do servidor"],
            ["database", "Database", "Nome da database"],
            ["user", "Usuário", "Nome do usuário"],
            ["from", "Data inicial", ""],
            ["to", "Data final", ""],
          ].map(([key, label, placeholder]) => (
            <div className="space-y-2" key={key}>
              <Label htmlFor={`audit-${key}`} className="text-xs">
                {label}
              </Label>
              <Input
                id={`audit-${key}`}
                className="h-9 text-xs"
                type={["from", "to"].includes(key) ? "date" : "text"}
                placeholder={placeholder}
                value={filters[key as keyof typeof filters]}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label className="text-xs">Operação</Label>
            <Select
              value={filters.action}
              onValueChange={(action) => setFilters((f) => ({ ...f, action }))}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as operações</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(status) => setFilters((f) => ({ ...f, status }))}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os resultados</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="h-9" disabled={isFetching}>
            <Search size={14} />
            Aplicar filtros
          </Button>
        </form>
      </Card>
      <QueryError error={error} />
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        {isFetching ? (
          <TableSkeleton />
        ) : data.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Data / hora",
                  "Usuário",
                  "Servidor / Host",
                  "Database",
                  "Operação",
                  "Resultado",
                  "Duração",
                  "Detalhes",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs">{row.username}</TableCell>
                  <TableCell>
                    <p className="text-xs">{row.serverName || "—"}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.host}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.databaseName || "—"}</TableCell>
                  <TableCell className="font-mono text-[10px]">{row.action}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.result} />
                  </TableCell>
                  <TableCell className="text-xs">{row.duration}ms</TableCell>
                  <TableCell className="max-w-72 whitespace-normal text-xs text-muted-foreground">
                    {row.details || "—"}
                    {row.ip && <p>IP: {row.ip}</p>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum registro encontrado"
            description="As ações realizadas serão registradas aqui. Ajuste os filtros para consultar o histórico."
          />
        )}
        <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
          <span>Página {page + 1} · até 50 registros</span>
          <div className="flex gap-2">
            <Button
              aria-label="Página anterior"
              variant="outline"
              size="icon"
              className="size-8"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              aria-label="Próxima página"
              variant="outline"
              size="icon"
              className="size-8"
              disabled={data.length < 50}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
};
