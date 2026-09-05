import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, operationItems, operations, servers } from "@/db/schema";
import { operationSchema } from "@/lib/validation/schemas";
import { assertMutable, deletionPhrase, parseSessionId } from "@/lib/security/identifiers";
import { AppError } from "@/lib/security/errors";
import { protectInternalDatabase } from "@/lib/database/provider";
import { configFor } from "./server.service";
export const enqueueOperation = async (
  input: unknown,
  user: { id: string; name: string },
  ip: string | null = null,
) => {
  const data = operationSchema.parse(input);
  if (data.action === "DROP_DATABASE" && data.confirmation !== deletionPhrase(data.names))
    throw new AppError("A confirmação não corresponde exatamente à exclusão solicitada.");
  if (data.action !== "DROP_DATABASE" && data.confirmation !== "TERMINATE")
    throw new AppError("Confirme o encerramento de conexões.");
  if (data.action === "TERMINATE_SESSION") {
    if (data.names.length !== 1 || !data.sessionId)
      throw new AppError("Selecione uma sessão e uma database.");
    parseSessionId(data.sessionId);
  }
  return db().transaction(async (tx) => {
    const [server] = await tx
      .select()
      .from(servers)
      .where(eq(servers.id, data.serverId))
      .for("update");
    if (!server || server.status === "removed") throw new AppError("Servidor não encontrado.", 404);
    data.names.forEach((name) => assertMutable(server.type, name));
    protectInternalDatabase(configFor(server), data.names);
    const [operation] = await tx
      .insert(operations)
      .values({
        serverId: server.id,
        serverName: server.name,
        userId: user.id,
        username: user.name,
        host: server.host,
        ip,
        action: data.action,
        terminate: data.terminate,
        sessionId: data.sessionId,
        total: data.names.length,
      })
      .returning();
    await tx
      .insert(operationItems)
      .values(data.names.map((databaseName) => ({ operationId: operation.id, databaseName })));
    await tx.insert(auditLogs).values({
      userId: user.id,
      username: user.name,
      serverId: server.id,
      serverName: server.name,
      host: server.host,
      ip,
      action:
        data.action === "DROP_DATABASE" && data.names.length > 1
          ? "DROP_DATABASE_BATCH"
          : data.action,
      result: "pending",
      details: `${data.names.length} database(s); confirmação validada; operação ${operation.id}.`,
    });
    return operation;
  });
};
export const listOperations = async () => {
  const rows = await db().select().from(operations).orderBy(desc(operations.createdAt)).limit(100);
  if (!rows.length) return [];
  const items = await db()
    .select()
    .from(operationItems)
    .where(
      inArray(
        operationItems.operationId,
        rows.map((r) => r.id),
      ),
    );
  return rows.map((row) => ({
    ...row,
    items: items.filter((item) => item.operationId === row.id),
  }));
};
export const assertNoActiveOperations = async (serverId: string) => {
  const rows = await db()
    .select({ id: operations.id })
    .from(operations)
    .where(
      and(eq(operations.serverId, serverId), inArray(operations.status, ["pending", "running"])),
    );
  if (rows.length)
    throw new AppError(
      "Aguarde a operação em andamento antes de editar ou remover este servidor.",
      409,
    );
};
export const operationCountToday = async () => {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(operations)
    .where(
      sql`${operations.createdAt} >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`,
    );
  return row.count;
};
