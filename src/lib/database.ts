import { invoke } from "@tauri-apps/api/core";
import type { ConnectionConfig, DatabaseInfo, DropResult } from "./types";

export const listDatabases = async (config: ConnectionConfig) =>
  invoke<DatabaseInfo[]>("list_databases", { config });

export const dropDatabases = async (config: ConnectionConfig, names: string[]) =>
  invoke<DropResult[]>("drop_databases", { config, names });

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Ocorreu um erro inesperado.";
};
