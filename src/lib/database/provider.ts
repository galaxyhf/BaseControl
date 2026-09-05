import type { ConnectionConfig, DatabaseProvider } from "./types";
import { PostgresProvider } from "./postgres/PostgresProvider";
import { SqlServerProvider } from "./sqlserver/SqlServerProvider";
import { assertAllowedHost } from "@/lib/security/network";
import { AppError } from "@/lib/security/errors";
export const createProvider = (config: ConnectionConfig): DatabaseProvider => {
  assertAllowedHost(config.host);
  return config.type === "postgres" ? new PostgresProvider(config) : new SqlServerProvider(config);
};
export const protectInternalDatabase = (config: ConnectionConfig, names: string[]) => {
  if (!process.env.DATABASE_URL || config.type !== "postgres") return;
  const url = new URL(process.env.DATABASE_URL);
  const normalize = (host: string) => host.toLowerCase().replace("-pooler", "");
  if (
    normalize(config.host) === normalize(url.hostname) &&
    names.includes(decodeURIComponent(url.pathname.slice(1)))
  )
    throw new AppError("O banco interno do BaseControl está protegido.", 403);
};
