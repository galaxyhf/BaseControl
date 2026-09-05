import sql from "mssql";
import { externalTlsEnabled } from "../tls";
import type {
  ConnectionConfig,
  DatabaseInfo,
  DatabaseProvider,
  DatabaseSession,
  TableInfo,
} from "../types";
import {
  assertMutable,
  isSystemDatabase,
  parseSessionId,
  quoteSqlServer,
} from "@/lib/security/identifiers";
import { AppError } from "@/lib/security/errors";

export class SqlServerProvider implements DatabaseProvider {
  constructor(private config: ConnectionConfig) {}
  private withPool = async <T>(
    database: string,
    action: (pool: sql.ConnectionPool) => Promise<T>,
  ): Promise<T> => {
    const pool = new sql.ConnectionPool({
      server: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database,
      connectionTimeout: this.config.timeout * 1000,
      requestTimeout: this.config.timeout * 1000,
      pool: { min: 0, max: 1, idleTimeoutMillis: 5000 },
      options: {
        encrypt: externalTlsEnabled(),
        trustServerCertificate: false,
        appName: "BaseControl",
        abortTransactionOnError: true,
      },
    });
    pool.on("error", () => {});
    try {
      await pool.connect();
      return await action(pool);
    } finally {
      await pool.close().catch(() => {});
    }
  };
  private query = async <T>(query: string, name?: string, database = "master") =>
    this.withPool(database, async (pool) => {
      const request = pool.request();
      if (name !== undefined) request.input("name", sql.NVarChar(128), name);
      return (await request.query<T>(query)).recordset;
    });
  testConnection = async () => {
    return { ...(await this.getServerInfo()), message: "Conexão estabelecida com sucesso." };
  };
  getServerInfo = async () => {
    const [row] = await this.query<{ version: string; databaseCount: number; connections: number }>(
      `SELECT CONVERT(varchar(128), SERVERPROPERTY('ProductVersion')) AS version, (SELECT count(*) FROM sys.databases) AS databaseCount, (SELECT count(*) FROM sys.dm_exec_sessions WHERE is_user_process = 1 AND session_id <> @@SPID) AS connections`,
    );
    return { ...row, version: `SQL Server ${row.version}`, status: "online" as const };
  };
  listDatabases = async (): Promise<DatabaseInfo[]> => {
    const rows = await this.query<DatabaseInfo & { id: number }>(
      `SELECT d.database_id AS id, d.name, coalesce(SUSER_SNAME(d.owner_sid), '') AS owner, coalesce((SELECT SUM(CONVERT(float, f.size)) * 8192 FROM sys.master_files f WHERE f.database_id = d.database_id), 0) AS size, (SELECT count(*) FROM sys.dm_exec_sessions s WHERE s.database_id = d.database_id AND s.is_user_process = 1 AND s.session_id <> @@SPID) AS connections, LOWER(d.state_desc) AS status, CONVERT(varchar(33), d.create_date, 126) AS createdAt FROM sys.databases d ORDER BY d.name`,
    );
    return rows.map((r) => ({
      ...r,
      isSystem: r.id <= 4 || isSystemDatabase("sqlserver", r.name),
    }));
  };
  listConnections = async (name: string): Promise<DatabaseSession[]> =>
    this.query<DatabaseSession>(
      `SELECT CONVERT(varchar(20), s.session_id) AS id, s.login_name AS username, coalesce(s.host_name, '') AS host, coalesce(s.program_name, '') AS application, s.status, DATEDIFF(SECOND, coalesce(s.last_request_start_time, s.login_time), GETDATE()) AS duration, CAST(NULL AS nvarchar(max)) AS query FROM sys.dm_exec_sessions s WHERE s.database_id = DB_ID(@name) AND s.is_user_process = 1 AND s.session_id <> @@SPID`,
      name,
    );
  getDatabaseInfo = async (name: string) => {
    const database = (await this.listDatabases()).find((d) => d.name === name);
    if (!database) throw new AppError("Database não encontrada.", 404);
    const sessions = await this.listConnections(name);
    const tables =
      database.status !== "online"
        ? []
        : await this.query<TableInfo>(
            `SELECT s.name AS [schema], t.name, SUM(CASE WHEN p.index_id IN (0, 1) THEN CONVERT(float, p.row_count) ELSE 0 END) AS rows, SUM(CASE WHEN p.index_id IN (0, 1) THEN CONVERT(float, p.used_page_count) ELSE 0 END) * 8192 AS dataSize, SUM(CASE WHEN p.index_id > 1 THEN CONVERT(float, p.used_page_count) ELSE 0 END) * 8192 AS indexSize, SUM(CONVERT(float, p.used_page_count)) * 8192 AS totalSize FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id JOIN sys.dm_db_partition_stats p ON p.object_id = t.object_id GROUP BY s.name, t.name ORDER BY totalSize DESC`,
            undefined,
            name,
          );
    return { ...database, sessions, tables };
  };
  private assertTarget = async (pool: sql.ConnectionPool, name: string) => {
    assertMutable("sqlserver", name);
    const { recordset } = await pool
      .request()
      .input("name", sql.NVarChar(128), name)
      .query<{ id: number }>("SELECT database_id AS id FROM sys.databases WHERE name = @name");
    if (!recordset.length) throw new AppError("Database não encontrada.", 404);
    if (recordset[0].id <= 4) throw new AppError("Database do sistema protegida.", 403);
  };
  terminateConnection = async (sessionId: string, databaseName: string) =>
    this.withPool("master", async (pool) => {
      await this.assertTarget(pool, databaseName);
      const id = parseSessionId(sessionId);
      // KILL não aceita um parâmetro; apenas o inteiro validado entra no comando.
      await pool
        .request()
        .input("name", sql.NVarChar(128), databaseName)
        .input("id", sql.Int, id)
        .query(
          `IF NOT EXISTS (SELECT 1 FROM sys.dm_exec_sessions WHERE session_id = @id AND database_id = DB_ID(@name) AND is_user_process = 1 AND session_id <> @@SPID) THROW 50000, 'Session unavailable', 1; KILL ${id};`,
        );
    });
  terminateDatabaseConnections = async (name: string) => {
    assertMutable("sqlserver", name);
    const sessions = await this.listConnections(name);
    for (const session of sessions) await this.terminateConnection(session.id, name);
  };
  dropDatabase = async (name: string, terminate = false) =>
    this.withPool("master", async (pool) => {
      await this.assertTarget(pool, name);
      const identifier = quoteSqlServer(name);
      if (!terminate) {
        await pool.request().query(`DROP DATABASE ${identifier}`);
        return;
      }
      // O TRY/CATCH restaura MULTI_USER se a exclusão falhar após o encerramento.
      await pool
        .request()
        .input("name", sql.NVarChar(128), name)
        .query(
          `BEGIN TRY ALTER DATABASE ${identifier} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${identifier}; END TRY BEGIN CATCH IF DB_ID(@name) IS NOT NULL BEGIN ALTER DATABASE ${identifier} SET MULTI_USER; END; THROW; END CATCH`,
        );
    });
}
