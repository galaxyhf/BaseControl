import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, PlugZap } from "lucide-react";
import type { ConnectionConfig, DatabaseEngine } from "../lib/types";

const CONNECTION_STORAGE_KEY = "basecontrol:last-connection";

const DEFAULT_PORTS: Record<DatabaseEngine, number> = {
  postgres: 5432,
  sqlserver: 1433,
};

type StoredConnectionConfig = Omit<ConnectionConfig, "password">;

const isDatabaseEngine = (value: unknown): value is DatabaseEngine =>
  value === "postgres" || value === "sqlserver";

const loadStoredConfig = (): StoredConnectionConfig | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CONNECTION_STORAGE_KEY) ?? "null");

    if (
      typeof value !== "object" ||
      value === null ||
      !("engine" in value) ||
      !isDatabaseEngine(value.engine) ||
      !("host" in value) ||
      typeof value.host !== "string" ||
      !("port" in value) ||
      typeof value.port !== "number" ||
      !Number.isInteger(value.port) ||
      value.port < 1 ||
      value.port > 65535 ||
      !("username" in value) ||
      typeof value.username !== "string"
    ) {
      return null;
    }

    return value as StoredConnectionConfig;
  } catch {
    return null;
  }
};

interface ConnectionFormProps {
  busy: boolean;
  connected: boolean;
  initialConfig?: ConnectionConfig;
  onConnect: (config: ConnectionConfig) => Promise<void>;
  onDisconnect: () => void;
  onEngineChange: (engine: DatabaseEngine) => void;
}

export const ConnectionForm = ({
  busy,
  connected,
  initialConfig,
  onConnect,
  onDisconnect,
  onEngineChange,
}: ConnectionFormProps) => {
  const [storedConfig] = useState(loadStoredConfig);
  const [engine, setEngine] = useState<DatabaseEngine>(
    initialConfig?.engine ?? storedConfig?.engine ?? "postgres",
  );
  const [host, setHost] = useState(initialConfig?.host ?? storedConfig?.host ?? "localhost");
  const [port, setPort] = useState(
    initialConfig?.port ?? storedConfig?.port ?? DEFAULT_PORTS.postgres,
  );
  const [username, setUsername] = useState(initialConfig?.username ?? storedConfig?.username ?? "");
  const [password, setPassword] = useState(initialConfig?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    onEngineChange(engine);
  }, [engine, onEngineChange]);

  useEffect(() => {
    if (!Number.isInteger(port) || port < 1 || port > 65535) return;

    const config: StoredConnectionConfig = {
      engine,
      host,
      port,
      username,
    };

    try {
      localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // O formulário continua funcional caso o armazenamento local esteja indisponível.
    }
  }, [engine, host, port, username]);

  const handleEngineChange = (nextEngine: DatabaseEngine) => {
    setEngine(nextEngine);
    setPort(DEFAULT_PORTS[nextEngine]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onConnect({
      engine,
      host: host.trim(),
      port,
      username: username.trim(),
      password,
    });
  };

  return (
    <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-5">
        <fieldset disabled={busy || connected} className="space-y-5 disabled:opacity-65">
          <div>
            <label className="field-label" htmlFor="engine">
              Tipo de banco
            </label>
            <select
              id="engine"
              className="field"
              value={engine}
              onChange={(event) => handleEngineChange(event.target.value as DatabaseEngine)}
            >
              <option value="postgres">PostgreSQL</option>
              <option value="sqlserver">SQL Server</option>
            </select>
          </div>

          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div>
              <label className="field-label" htmlFor="host">
                Host
              </label>
              <input
                id="host"
                className="field"
                value={host}
                onChange={(event) => setHost(event.target.value)}
                required
                spellCheck={false}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="port">
                Porta
              </label>
              <input
                id="port"
                className="field"
                type="number"
                min={1}
                max={65535}
                value={port}
                onChange={(event) => setPort(event.target.valueAsNumber)}
                required
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="username">
              Usuário
            </label>
            <input
              id="username"
              className="field"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              spellCheck={false}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                className="field pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                className="icon-button absolute right-1.5 top-1/2 -translate-y-1/2"
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </fieldset>
      </div>

      <div className="mt-auto pt-7">
        {connected ? (
          <button
            className="button secondary w-full"
            type="button"
            onClick={onDisconnect}
            disabled={busy}
          >
            Desconectar
          </button>
        ) : (
          <button className="button primary w-full" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <PlugZap size={16} />}
            {busy ? "Conectando..." : "Conectar"}
          </button>
        )}
      </div>
    </form>
  );
};
