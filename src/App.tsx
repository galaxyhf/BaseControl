import { useState } from "react";
import { CheckCircle2, DatabaseZap, XCircle } from "lucide-react";
import { ConnectionForm } from "./components/ConnectionForm";
import { DatabaseList } from "./components/DatabaseList";
import { DeleteDialog } from "./components/DeleteDialog";
import { dropDatabases, getErrorMessage, listDatabases } from "./lib/database";
import type { ConnectionConfig, DatabaseInfo, DropResult } from "./lib/types";

type BusyAction = "connect" | "refresh" | "delete" | null;

export const App = () => {
  const [config, setConfig] = useState<ConnectionConfig | null>(null);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DropResult[]>([]);
  const [confirming, setConfirming] = useState(false);

  const loadDatabases = async (connection: ConnectionConfig, action: BusyAction) => {
    setBusy(action);
    setError(null);
    try {
      const nextDatabases = await listDatabases(connection);
      setDatabases(nextDatabases);
      setSelected(new Set());
      return true;
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const handleConnect = async (connection: ConnectionConfig) => {
    const connected = await loadDatabases(connection, "connect");
    if (connected) {
      setConfig(connection);
      setResults([]);
    }
  };

  const handleDisconnect = () => {
    setConfig(null);
    setDatabases([]);
    setSelected(new Set());
    setResults([]);
    setError(null);
  };

  const handleToggle = (name: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleToggleAll = () => {
    const allSelected = databases.every((database) => selected.has(database.name));
    setSelected(allSelected ? new Set() : new Set(databases.map((database) => database.name)));
  };

  const handleDelete = async () => {
    if (!config || selected.size === 0) return;
    setConfirming(false);
    setBusy("delete");
    setError(null);
    try {
      const dropResults = await dropDatabases(config, [...selected]);
      setResults(dropResults);
      await loadDatabases(config, "refresh");
    } catch (dropError) {
      setError(getErrorMessage(dropError));
    } finally {
      setBusy(null);
    }
  };

  const selectedNames = [...selected].sort((first, second) => first.localeCompare(second));

  return (
    <main className="h-screen min-h-[500px] overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-violet-500 text-white shadow-lg shadow-violet-950">
            <DatabaseZap size={17} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">BaseControl</h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Desktop</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`size-1.5 rounded-full ${config ? "bg-emerald-400" : "bg-zinc-700"}`} />
          {config ? `${config.host}:${config.port}` : "Desconectado"}
        </div>
      </header>

      <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[300px_1fr] grid-rows-[minmax(0,1fr)]">
        <aside className="border-r border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-6">
            <h2 className="text-base font-medium">Conexão</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Informe o servidor para gerenciar suas bases.
            </p>
          </div>
          <div className="h-[calc(100%-4.25rem)]">
            <ConnectionForm
              key={config ? "connected" : "disconnected"}
              busy={busy !== null}
              connected={config !== null}
              initialConfig={config ?? undefined}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {error ? <StatusBar kind="error" message={error} /> : null}
          {results.length > 0 ? (
            <StatusBar
              kind={results.every((result) => result.success) ? "success" : "error"}
              message={formatResults(results)}
            />
          ) : null}
          <DatabaseList
            databases={databases}
            selected={selected}
            busy={busy !== null}
            connected={config !== null}
            onRefresh={() => config && void loadDatabases(config, "refresh")}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            onDelete={() => setConfirming(true)}
          />
        </div>
      </div>

      {confirming ? (
        <DeleteDialog
          names={selectedNames}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}
    </main>
  );
};

const StatusBar = ({ kind, message }: { kind: "success" | "error"; message: string }) => (
  <div
    className={`flex items-start gap-2 border-b px-5 py-3 text-xs ${kind === "success" ? "border-emerald-950 bg-emerald-950/30 text-emerald-300" : "border-red-950 bg-red-950/30 text-red-300"}`}
    role="status"
  >
    {kind === "success" ? (
      <CheckCircle2 className="mt-0.5 shrink-0" size={14} />
    ) : (
      <XCircle className="mt-0.5 shrink-0" size={14} />
    )}
    <span className="line-clamp-2 leading-4">{message}</span>
  </div>
);

const formatResults = (results: DropResult[]) => {
  const succeeded = results.filter((result) => result.success).length;
  const failed = results.length - succeeded;
  return failed === 0
    ? `${succeeded} base${succeeded === 1 ? " excluída" : "s excluídas"} com sucesso.`
    : `${succeeded} excluída${succeeded === 1 ? "" : "s"}; ${failed} falha${failed === 1 ? "" : "s"}. ${results
        .filter((result) => !result.success)
        .map((result) => `${result.name}: ${result.message}`)
        .join(" ")}`;
};
