"use client";
import Link from "next/link";
import { useConnectServer } from "@/hooks/use-connect-server";
import { ArrowUpRight, Database, MoreHorizontal, Pencil, Plug, Trash2 } from "lucide-react";
import type { SavedServer } from "@/lib/database/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
export const ServerCard = ({
  server,
  onEdit,
  onRemove,
}: {
  server: SavedServer;
  onEdit?: () => void;
  onRemove?: () => void;
}) => {
  const connect = useConnectServer();
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-primary/15 bg-primary/5">
              <Database className="size-5 text-primary" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">{server.name}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {server.type === "postgres" ? "PostgreSQL" : "Microsoft SQL Server"}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label={`Ações de ${server.name}`}
              >
                <MoreHorizontal size={17} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={connect.isPending}
                onClick={() => connect.mutate(server.id)}
              >
                <Plug size={14} />
                Conectar
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil size={14} />
                  Editar
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-destructive">
                  <Trash2 size={14} />
                  Remover
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {server.host}:{server.port}
          </p>
          <StatusBadge status={server.status} />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Databases</p>
            <p className="mt-1 font-mono text-xl">{server.databaseCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Conexões ativas</p>
            <p className="mt-1 font-mono text-xl">{server.connections}</p>
          </div>
        </div>
        <p className="mt-4 truncate text-[10px] text-muted-foreground">
          {server.version || "Versão não verificada"}
        </p>
      </div>
      <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3">
        <span className="text-[10px] text-muted-foreground">
          {formatDate(server.lastUpdatedAt)}
        </span>
        <Link
          href={`/servers/${server.id}`}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          Abrir servidor <ArrowUpRight size={13} />
        </Link>
      </div>
    </Card>
  );
};
