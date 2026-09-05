"use client";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Database,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { DatabaseInfo, SavedServer } from "@/lib/database/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { DatabaseDrawer } from "./DatabaseDrawer";
import { OperationDialog, type OperationTarget } from "./OperationDialog";
export const DatabaseTable = ({
  databases,
  server,
  initialName,
}: {
  databases: DatabaseInfo[];
  server: SavedServer;
  initialName?: string;
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"name" | "size" | "connections">("name");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<string | undefined>(initialName);
  const [target, setTarget] = useState<OperationTarget>();
  const filtered = useMemo(
    () =>
      databases
        .filter(
          (d) =>
            d.name.toLowerCase().includes(search.toLowerCase()) &&
            (filter === "all" ||
              (filter === "active" && d.connections > 0) ||
              (filter === "idle" && d.connections === 0) ||
              (filter === "system" && d.isSystem) ||
              (filter === "offline" && d.status !== "online")),
        )
        .sort(
          (a, b) =>
            (sort === "name" ? a.name.localeCompare(b.name) : a[sort] - b[sort]) *
            (descending ? -1 : 1),
        ),
    [databases, search, filter, sort, descending],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 20, (currentPage + 1) * 20);
  const selectable = filtered.filter((d) => !d.isSystem);
  const checked = databases.filter((d) => selected.has(d.name) && !d.isSystem);
  const allSelected = selectable.length > 0 && selectable.every((d) => selected.has(d.name));
  const detail = databases.find((d) => d.name === details);
  const toggle = (name: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const changeSort = (key: typeof sort) => {
    if (sort === key) setDescending(!descending);
    else {
      setSort(key);
      setDescending(key !== "name");
    }
  };
  return (
    <>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="h-9 pl-9 text-xs"
              placeholder="Buscar database..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={filter}
              onValueChange={(v) => {
                setFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  ["all", "Todas as databases"],
                  ["active", "Com conexões"],
                  ["idle", "Sem conexões"],
                  ["system", "Databases do sistema"],
                  ["offline", "Offline"],
                ].map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs">
                  Selecionar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    setSelected(new Set(databases.filter((d) => !d.isSystem).map((d) => d.name)))
                  }
                >
                  Selecionar todas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelected(new Set(selectable.map((d) => d.name)))}
                >
                  Selecionar todas filtradas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelected(new Set())}>
                  Desmarcar todas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {filtered.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12 pl-5">
                  <Checkbox
                    aria-label="Selecionar todas filtradas"
                    disabled={!selectable.length}
                    checked={
                      allSelected
                        ? true
                        : selectable.some((d) => selected.has(d.name))
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(v) =>
                      setSelected((previous) => {
                        const next = new Set(previous);
                        selectable.forEach((d) => (v ? next.add(d.name) : next.delete(d.name)));
                        return next;
                      })
                    }
                  />
                </TableHead>
                <TableHead>
                  <button className="flex items-center gap-2" onClick={() => changeSort("name")}>
                    Nome <ArrowDownUp size={12} />
                  </button>
                </TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>
                  <button className="flex items-center gap-2" onClick={() => changeSort("size")}>
                    Tamanho <ArrowDownUp size={12} />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-2"
                    onClick={() => changeSort("connections")}
                  >
                    Conexões <ArrowDownUp size={12} />
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Criação</TableHead>
                <TableHead className="text-right pr-5">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((database) => (
                <TableRow
                  key={database.name}
                  data-state={selected.has(database.name) ? "selected" : undefined}
                  className="h-16"
                >
                  <TableCell className="pl-5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Checkbox
                            aria-label={`Selecionar ${database.name}`}
                            disabled={database.isSystem}
                            checked={selected.has(database.name) && !database.isSystem}
                            onCheckedChange={() => toggle(database.name)}
                          />
                        </span>
                      </TooltipTrigger>
                      {database.isSystem && (
                        <TooltipContent>
                          Operações administrativas destrutivas estão bloqueadas para esta database.
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setDetails(database.name)}
                      className="flex items-center gap-2 text-xs font-medium hover:text-primary"
                    >
                      <Database className="size-4 text-muted-foreground" />
                      {database.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {database.owner || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatBytes(database.size)}</TableCell>
                  <TableCell className="font-mono text-xs">{database.connections}</TableCell>
                  <TableCell>
                    <StatusBadge status={database.status} />
                  </TableCell>
                  <TableCell>
                    {database.isSystem ? (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <ShieldCheck size={11} />
                        Sistema
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Usuário</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {formatDate(database.createdAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`Ações da database ${database.name}`}
                        >
                          <MoreHorizontal size={17} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetails(database.name)}>
                          <Database size={14} />
                          Ver detalhes e tabelas
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={database.isSystem}
                          onClick={() =>
                            setTarget({
                              action: "TERMINATE_DATABASE_CONNECTIONS",
                              databases: [database],
                            })
                          }
                        >
                          <Unplug size={14} />
                          Encerrar conexões
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={database.isSystem}
                          className="text-destructive"
                          onClick={() =>
                            setTarget({ action: "DROP_DATABASE", databases: [database] })
                          }
                        >
                          <Trash2 size={14} />
                          Excluir database
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={
              databases.length
                ? "Nenhuma database corresponde aos filtros selecionados"
                : "Nenhuma database encontrada"
            }
            description="Atualize os dados ou ajuste os filtros para continuar."
          />
        )}
        <div className="flex items-center justify-between border-t px-5 py-3 text-[11px] text-muted-foreground">
          <span>
            {filtered.length} databases · {checked.length} selecionadas
          </span>
          <div className="flex items-center gap-3">
            <span>
              {currentPage + 1} de {pages}
            </span>
            <Button
              aria-label="Página anterior"
              size="icon"
              variant="outline"
              className="size-7"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              aria-label="Próxima página"
              size="icon"
              variant="outline"
              className="size-7"
              disabled={currentPage >= pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
      {checked.length > 0 && (
        <div className="fixed bottom-5 left-1/2 z-30 flex w-[calc(100%-32px)] max-w-2xl -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-lg border bg-popover px-4 py-3 shadow-lg">
          <span className="text-xs font-medium">{checked.length} databases selecionadas</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTarget({ action: "TERMINATE_DATABASE_CONNECTIONS", databases: checked })
              }
            >
              <Unplug size={13} />
              Encerrar conexões
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setTarget({ action: "DROP_DATABASE", databases: checked })}
            >
              <Trash2 size={13} />
              Excluir databases
            </Button>
            <Button
              aria-label="Limpar seleção"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setSelected(new Set())}
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}
      {detail && (
        <DatabaseDrawer
          key={detail.name}
          database={detail}
          server={server}
          close={() => setDetails(undefined)}
        />
      )}
      {target && (
        <OperationDialog
          target={target}
          serverId={server.id}
          close={() => setTarget(undefined)}
          onSuccess={() => setSelected(new Set())}
        />
      )}
    </>
  );
};
