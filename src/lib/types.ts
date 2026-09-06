export type DatabaseEngine = "postgres" | "sqlserver";

export interface ConnectionConfig {
  engine: DatabaseEngine;
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface DatabaseInfo {
  name: string;
  sizeBytes: number;
}

export interface DropResult {
  name: string;
  success: boolean;
  message: string;
}
