import { Client, type QueryResultRow } from "pg";
import { externalTlsEnabled } from "../tls";
import type {
  ConnectionConfig,
  DatabaseProvider,
  DatabaseInfo,
  DatabaseSession,
  TableInfo,
} from "../types";
import {
  assertMutable,
  isSystemDatabase,
  parseSessionId,
  quotePostgres,
} from "@/lib/security/identifiers";
import { AppError } from "@/lib/security/errors";

export class PostgresProvider implements DatabaseProvider {
  constructor(private config: ConnectionConfig) {}
  private withClient = async <T>(
    database: string,
    action: (client: Client) => Promise<T>,
  ): Promise<T> => {
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database,
      ssl: externalTlsEnabled() ? { rejectUnauthorized: true } : false,
      connectionTimeoutMillis: this.config.timeout * 1000,
      statement_timeout: this.config.timeout * 1000,
      query_timeout: (this.config.timeout + 2) * 1000,
      application_name: "BaseControl",
    });
    client.on("error", () => {});
    try {
      await client.connect();
      return await action(client);
    } finally {
      await client.end().catch(() => {});
    }
  };
  private query = async <T extends QueryResultRow>(
    sql: string,
    values: unknown[] = [],
    database = "postgres",
  ) => this.withClient(database, async (client) => (await client.query<T>(sql, values)).rows);
  testConnection = async () => ({
    ...(await this.getServerInfo()),
    message: "Conexão estabelecida com sucesso.",
  });
  getServerInfo = async () => {
    const [row] = await this.query<{ version: string; databaseCount: number; connections: number }>(
      `SELECT current_setting('server_version') AS version, (SELECT count(*)::int FROM pg_database) AS "databaseCount", (SELECT count(*)::int FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()) AS connections`,
    );
    return { ...row, version: `PostgreSQL ${row.version}`, status: "online" as const };
  };
  listDatabases = async (): Promise<DatabaseInfo[]> => {
    const rows = await this.query<{
      name: string;
      owner: string;
      size: string;
      connections: number;
      allow: boolean;
      template: boolean;
    }>(
      `SELECT d.datname AS name, pg_get_userbyid(d.datdba) AS owner, CASE WHEN has_database_privilege(d.oid, 'CONNECT') THEN pg_database_size(d.oid)::text ELSE '0' END AS size, (SELECT count(*)::int FROM pg_stat_activity a WHERE a.datid = d.oid AND a.backend_type = 'client backend' AND a.pid <> pg_backend_pid()) AS connections, d.datallowconn AS allow, d.datistemplate AS template FROM pg_database d ORDER BY d.datname`,
    );
    return rows.map((r) => ({
      name: r.name,
      owner: r.owner,
      size: Number(r.size),
      connections: r.connections,
      status: r.allow ? "online" : "offline",
      isSystem: r.template || isSystemDatabase("postgres", r.name),
      createdAt: null,
    }));
  };
  listConnections = async (name: string): Promise<DatabaseSession[]> => {
    const rows = await this.query<DatabaseSession>(
      `SELECT pid::text AS id, coalesce(usename, '') AS username, coalesce(client_addr::text, 'local') AS host, coalesce(application_name, '') AS application, coalesce(state, 'unknown') AS status, coalesce(extract(epoch FROM now() - query_start)::int, 0) AS duration, NULL::text AS query FROM pg_stat_activity WHERE datname = $1 AND backend_type = 'client backend' AND pid <> pg_backend_pid()`,
      [name],
    );
    return rows;
  };
  getDatabaseInfo = async (name: string) => {
    const database = (await this.listDatabases()).find((d) => d.name === name);
    if (!database) throw new AppError("Database não encontrada.", 404);
    const sessions = await this.listConnections(name);
    const tables =
      database.status === "offline"
        ? []
        : await this.query<TableInfo>(
            `SELECT n.nspname AS schema, c.relname AS name, greatest(c.reltuples, 0)::float8 AS rows, pg_table_size(c.oid)::float8 AS "dataSize", pg_indexes_size(c.oid)::float8 AS "indexSize", pg_total_relation_size(c.oid)::float8 AS "totalSize" FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r','m') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' ORDER BY pg_total_relation_size(c.oid) DESC`,
            [],
            name,
          );
    return { ...database, sessions, tables };
  };
  private assertTarget = async (client: Client, name: string) => {
    assertMutable("postgres", name);
    const { rows } = await client.query<{ template: boolean }>(
      "SELECT datistemplate AS template FROM pg_database WHERE datname = $1",
      [name],
    );
    if (!rows.length) throw new AppError("Database não encontrada.", 404);
    if (rows[0].template) throw new AppError("Databases template estão protegidas.", 403);
  };
  terminateConnection = async (sessionId: string, databaseName: string) =>
    this.withClient("postgres", async (client) => {
      await this.assertTarget(client, databaseName);
      const { rows } = await client.query<{ terminated: boolean }>(
        "SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE pid = $1 AND datname = $2 AND backend_type = 'client backend' AND pid <> pg_backend_pid()",
        [parseSessionId(sessionId), databaseName],
      );
      if (!rows.length) throw new AppError("A sessão não existe mais nesta database.", 409);
      if (!rows[0].terminated) throw new AppError("Não foi possível encerrar a sessão.", 409);
    });
  terminateDatabaseConnections = async (name: string) =>
    this.withClient("postgres", async (client) => {
      await this.assertTarget(client, name);
      const { rows } = await client.query<{ terminated: boolean }>(
        "SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE datname = $1 AND backend_type = 'client backend' AND pid <> pg_backend_pid()",
        [name],
      );
      if (rows.some((r) => !r.terminated))
        throw new AppError("Algumas conexões não puderam ser encerradas.", 409);
    });
  dropDatabase = async (name: string, terminate = false) =>
    this.withClient("postgres", async (client) => {
      await this.assertTarget(client, name);
      // Identificadores são delimitados e escapados; valores nunca são usados como SQL livre.
      await client.query(`DROP DATABASE ${quotePostgres(name)}${terminate ? " WITH (FORCE)" : ""}`);
    });
}
