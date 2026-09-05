import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { AppError } from "@/lib/security/errors";
const globalDb = globalThis as unknown as { basecontrolPool?: Pool };
export const getPool = () => {
  if (!process.env.DATABASE_URL)
    throw new AppError("Configure DATABASE_URL e execute as migrations para conectar o Neon.", 503);
  if (!globalDb.basecontrolPool) {
    globalDb.basecontrolPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      statement_timeout: 15000,
    });
    globalDb.basecontrolPool.on("error", () => {
      /* Erros de conexão não devem expor a connection string. */
    });
  }
  return globalDb.basecontrolPool;
};
export const db = () => drizzle(getPool(), { schema });
