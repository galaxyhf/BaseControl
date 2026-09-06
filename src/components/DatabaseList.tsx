import { Database, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import postgresqlLogo from "../assets/postgresql.svg";
import sqlServerLogo from "../assets/sql-server.svg";
import type { DatabaseEngine, DatabaseInfo } from "../lib/types";

interface DatabaseListProps {
  databases: DatabaseInfo[];
  selected: Set<string>;
  busy: boolean;
  connected: boolean;
  engine: DatabaseEngine;
  onRefresh: () => void;
  onToggle: (name: string) => void;
  onToggleAll: () => void;
  onDelete: () => void;
}

export const DatabaseList = ({
  databases,
  selected,
  busy,
  connected,
  engine,
  onRefresh,
  onToggle,
  onToggleAll,
  onDelete,
}: DatabaseListProps) => {
  const allSelected =
    databases.length > 0 && databases.every((database) => selected.has(database.name));

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            className="size-8 object-contain"
            src={engine === "postgres" ? postgresqlLogo : sqlServerLogo}
            alt=""
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Bases de dados</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {connected ? `${databases.length} encontradas` : "Conecte a um servidor"}
            </p>
          </div>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Atualizar bases"
          title="Atualizar"
          onClick={onRefresh}
          disabled={!connected || busy}
        >
          <RefreshCw className={busy ? "animate-spin" : ""} size={16} />
        </button>
      </div>

      {connected && databases.length > 0 ? (
        <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-950/40 px-5 py-2.5">
          <label className="check-row text-xs">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              disabled={busy || databases.length === 0}
            />
            Selecionar todas
          </label>
          <span className="text-xs tabular-nums text-zinc-500">
            {selected.size} selecionada{selected.size === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!connected ? (
          <EmptyState label="Preencha os dados ao lado para listar as bases." />
        ) : databases.length === 0 ? (
          <EmptyState label="Nenhuma base disponível nesta conexão." />
        ) : (
          <ul className="space-y-1" aria-label="Bases disponíveis">
            {databases.map((database) => (
              <li key={database.name}>
                <label className="database-row cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(database.name)}
                    disabled={busy}
                    onChange={() => onToggle(database.name)}
                    aria-label={`Selecionar ${database.name}`}
                  />
                  <span className="database-icon">
                    <Database size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">
                    {database.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {formatBytes(database.sizeBytes)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-800 p-4">
        <button
          className="button danger w-full"
          type="button"
          disabled={busy || selected.size === 0}
          onClick={onDelete}
        >
          {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
          Excluir{" "}
          {selected.size > 0
            ? `${selected.size} base${selected.size === 1 ? "" : "s"}`
            : "selecionadas"}
        </button>
      </div>
    </section>
  );
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1);
  const value = bytes / 1024 ** (unitIndex + 1);

  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="grid h-full min-h-64 place-items-center px-8 text-center">
    <div>
      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500">
        <Database size={18} />
      </div>
      <p className="max-w-56 text-sm leading-5 text-zinc-500">{label}</p>
    </div>
  </div>
);
