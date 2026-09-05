import type { Engine } from "@/lib/database/types";
import { AppError } from "./errors";
export const isSystemDatabase = (type: Engine, name: string) =>
  (type === "postgres"
    ? ["postgres", "template0", "template1"]
    : ["master", "model", "msdb", "tempdb"]
  ).includes(type === "sqlserver" ? name.toLowerCase() : name);
export const assertDatabaseName = (name: string, type: Engine) => {
  if (
    !name ||
    name.includes("\0") ||
    (type === "postgres" ? Buffer.byteLength(name, "utf8") > 63 : name.length > 128)
  )
    throw new AppError("Nome de database inválido.");
  return name;
};
export const assertMutable = (type: Engine, name: string) => {
  assertDatabaseName(name, type);
  if (isSystemDatabase(type, name))
    throw new AppError("Operações destrutivas estão bloqueadas para databases do sistema.", 403);
};
export const quotePostgres = (name: string) =>
  `"${assertDatabaseName(name, "postgres").replaceAll('"', '""')}"`;
export const quoteSqlServer = (name: string) =>
  `[${assertDatabaseName(name, "sqlserver").replaceAll("]", "]]")}]`;
export const parseSessionId = (value: string) => {
  if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > 2147483647)
    throw new AppError("Identificador de sessão inválido.");
  return Number(value);
};
export const deletionPhrase = (names: string[]) =>
  names.length === 1 ? names[0] : `DELETE ${names.length} DATABASES`;
