export type Engine = "postgres" | "sqlserver";
export type OperationStatus = "pending" | "running" | "success" | "partial" | "failed";
export interface ConnectionConfig {
  type: Engine;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  timeout: number;
}
export interface ServerInfo {
  version: string;
  status: "online" | "offline";
  databaseCount: number;
  connections: number;
}
export interface ConnectionResult extends ServerInfo {
  message: string;
}
export interface DatabaseInfo {
  name: string;
  owner: string;
  size: number;
  connections: number;
  status: string;
  isSystem: boolean;
  createdAt: string | null;
}
export interface DatabaseSession {
  id: string;
  username: string;
  host: string;
  application: string;
  status: string;
  duration: number;
  query: string | null;
}
export interface TableInfo {
  schema: string;
  name: string;
  rows: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
}
export interface DatabaseDetails extends DatabaseInfo {
  sessions: DatabaseSession[];
  tables: TableInfo[];
}
export interface DatabaseProvider {
  testConnection(): Promise<ConnectionResult>;
  getServerInfo(): Promise<ServerInfo>;
  listDatabases(): Promise<DatabaseInfo[]>;
  getDatabaseInfo(name: string): Promise<DatabaseDetails>;
  listConnections(name: string): Promise<DatabaseSession[]>;
  terminateConnection(sessionId: string, databaseName: string): Promise<void>;
  terminateDatabaseConnections(name: string): Promise<void>;
  dropDatabase(name: string, terminate?: boolean): Promise<void>;
}
export interface SavedServer {
  id: string;
  name: string;
  type: Engine;
  host: string;
  port: number;
  username: string;
  timeout: number;
  status: string;
  version: string | null;
  databaseCount: number;
  connections: number;
  lastConnectedAt: string | null;
  lastUpdatedAt: string | null;
  lastError: string | null;
}
export interface ServerSnapshot {
  server: SavedServer;
  databases: DatabaseInfo[];
  error?: string;
}
export interface OperationItem {
  id: string;
  databaseName: string;
  status: OperationStatus;
  message: string | null;
  duration: number | null;
}
export interface OperationRecord {
  id: string;
  serverId: string;
  serverName: string;
  action: string;
  status: OperationStatus;
  total: number;
  completed: number;
  failed: number;
  createdAt: string;
  finishedAt: string | null;
  items: OperationItem[];
}
export interface AuditRecord {
  id: string;
  createdAt: string;
  username: string;
  serverName: string | null;
  host: string | null;
  databaseName: string | null;
  action: string;
  result: string;
  duration: number;
  details: string | null;
  ip: string | null;
}
