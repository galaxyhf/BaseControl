export type DatabaseEngine = "postgres" | "sqlserver";

export interface ConnectionConfig {
  engine: DatabaseEngine;
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  trustServerCertificate: boolean;
}

export interface DatabaseInfo {
  name: string;
  isSystem: boolean;
}

export interface DropResult {
  name: string;
  success: boolean;
  message: string;
}
