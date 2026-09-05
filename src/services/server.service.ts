import { and, eq, getTableColumns, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { createProvider } from "@/lib/database/provider";
import { decrypt } from "@/lib/encryption/credentials";
import { AppError, safeError } from "@/lib/security/errors";
import type { ConnectionConfig } from "@/lib/database/types";
const columns = getTableColumns(servers);
// A projeção explícita impede que ciphertext ou credenciais futuras vazem pela API.
export const publicColumns = {
  id: columns.id,
  name: columns.name,
  type: columns.type,
  host: columns.host,
  port: columns.port,
  username: columns.username,
  timeout: columns.timeout,
  status: columns.status,
  version: columns.version,
  databaseCount: columns.databaseCount,
  connections: columns.connections,
  lastConnectedAt: columns.lastConnectedAt,
  lastUpdatedAt: columns.lastUpdatedAt,
  lastError: columns.lastError,
};
export const listServers = () =>
  db()
    .select(publicColumns)
    .from(servers)
    .where(notInArray(servers.status, ["removed"]))
    .orderBy(servers.name);
export const getServer = async (id: string) => {
  const [server] = await db().select().from(servers).where(eq(servers.id, id));
  if (!server || server.status === "removed") throw new AppError("Servidor não encontrado.", 404);
  return server;
};
export const configFor = (server: typeof servers.$inferSelect): ConnectionConfig => ({
  type: server.type,
  name: server.name,
  host: server.host,
  port: server.port,
  username: server.username,
  password: decrypt(server.encryptedPassword, server.id),
  timeout: server.timeout,
});
export const refreshServer = async (id: string) => {
  const server = await getServer(id);
  const unchanged = and(
    eq(servers.id, id),
    ne(servers.status, "removed"),
    eq(servers.host, server.host),
    eq(servers.port, server.port),
    eq(servers.username, server.username),
    eq(servers.encryptedPassword, server.encryptedPassword),
    eq(servers.type, server.type),
    eq(servers.timeout, server.timeout),
  );
  try {
    const provider = createProvider(configFor(server));
    const info = await provider.getServerInfo();
    const databases = await provider.listDatabases();
    const [updated] = await db()
      .update(servers)
      .set({ ...info, lastUpdatedAt: new Date(), lastConnectedAt: new Date(), lastError: null })
      .where(unchanged)
      .returning(publicColumns);
    if (!updated)
      throw new AppError("A conexão foi alterada durante a consulta. Atualize novamente.", 409);
    return { server: updated, databases };
  } catch (error) {
    const message = safeError(error);
    const [updated] = await db()
      .update(servers)
      .set({ status: "offline", lastUpdatedAt: new Date(), lastError: message })
      .where(unchanged)
      .returning(publicColumns);
    if (!updated)
      throw new AppError("A conexão foi alterada durante a consulta. Atualize novamente.", 409);
    return { server: updated, databases: [], error: message };
  }
};
const queueState = globalThis as unknown as {
  basecontrolSlots?: { active: number; waiting: Array<() => void> };
};
const slots = (queueState.basecontrolSlots ??= { active: 0, waiting: [] });
export const withConnectionSlot = async <T>(action: () => Promise<T>): Promise<T> => {
  if (slots.waiting.length >= 32)
    throw new AppError("Há muitas consultas em andamento. Tente novamente em instantes.", 429);
  if (slots.active >= 3) await new Promise<void>((resolve) => slots.waiting.push(resolve));
  else slots.active++;
  try {
    return await action();
  } finally {
    const next = slots.waiting.shift();
    if (next) next();
    else slots.active--;
  }
};
export const searchAllServers = async () => {
  const list = await listServers();
  const results: Awaited<ReturnType<typeof refreshServer>>[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, list.length) }, async () => {
      while (cursor < list.length) {
        const server = list[cursor++];
        results.push(await withConnectionSlot(() => refreshServer(server.id)));
      }
    }),
  );
  return results;
};
