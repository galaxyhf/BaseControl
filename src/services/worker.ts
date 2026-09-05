import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, operationItems, operations } from "@/db/schema";
import { createProvider, protectInternalDatabase } from "@/lib/database/provider";
import { AppError, safeError } from "@/lib/security/errors";
import { configFor, getServer } from "./server.service";

const processOperation = async (operation: typeof operations.$inferSelect) => {
  const items = await db()
    .select()
    .from(operationItems)
    .where(eq(operationItems.operationId, operation.id));
  let completed = 0;
  let failed = 0;
  let externalStarted = false;
  const heartbeat = setInterval(() => {
    void db()
      .update(operations)
      .set({ heartbeatAt: sql`now()` })
      .where(and(eq(operations.id, operation.id), eq(operations.status, "running")))
      .catch(() => {});
  }, 10000);
  try {
    const config = configFor(await getServer(operation.serverId));
    const provider = createProvider(config);
    for (const item of items) {
      const started = Date.now();
      await db()
        .update(operationItems)
        .set({
          status: "running",
          message:
            operation.action === "DROP_DATABASE"
              ? operation.terminate
                ? "Encerrando conexões e excluindo..."
                : "Excluindo database..."
              : "Encerrando conexões...",
        })
        .where(eq(operationItems.id, item.id));
      let message = "Operação realizada com sucesso.";
      let status: "success" | "failed" = "success";
      try {
        // Sem lease válida, nenhuma nova ação externa pode começar.
        const [current] = await db()
          .select({ status: operations.status })
          .from(operations)
          .where(eq(operations.id, operation.id));
        if (current?.status !== "running")
          throw new AppError("Operação interrompida. Verifique o estado no servidor.");
        protectInternalDatabase(config, [item.databaseName]);
        externalStarted = true;
        if (operation.action === "DROP_DATABASE")
          await provider.dropDatabase(item.databaseName, operation.terminate);
        else if (operation.action === "TERMINATE_SESSION")
          await provider.terminateConnection(operation.sessionId!, item.databaseName);
        else await provider.terminateDatabaseConnections(item.databaseName);
      } catch (error) {
        status = "failed";
        message = safeError(error);
        failed++;
      }
      completed++;
      await db().transaction(async (tx) => {
        await tx
          .update(operationItems)
          .set({ status, message, duration: Date.now() - started })
          .where(eq(operationItems.id, item.id));
        await tx
          .update(operations)
          .set({ completed, failed, heartbeatAt: sql`now()` })
          .where(eq(operations.id, operation.id));
        await tx.insert(auditLogs).values({
          userId: operation.userId,
          username: operation.username,
          serverId: operation.serverId,
          serverName: operation.serverName,
          host: operation.host,
          databaseName: item.databaseName,
          action: operation.action,
          result: status,
          duration: Date.now() - started,
          details: message,
          ip: operation.ip,
        });
      });
    }
    await db()
      .update(operations)
      .set({
        status: failed === 0 ? "success" : failed === completed ? "failed" : "partial",
        finishedAt: new Date(),
      })
      .where(eq(operations.id, operation.id));
  } catch (error) {
    const details = externalStarted
      ? `Falha ao registrar o resultado. Atualize o servidor antes de repetir. ${safeError(error)}`
      : `Não foi possível preparar a operação. ${safeError(error)}`;
    await db().transaction(async (tx) => {
      const remaining = await tx
        .update(operationItems)
        .set({ status: "failed", message: details })
        .where(
          and(
            eq(operationItems.operationId, operation.id),
            inArray(operationItems.status, ["pending", "running"]),
          ),
        )
        .returning({ id: operationItems.id });
      await tx
        .update(operations)
        .set({
          status: "failed",
          completed: operation.total,
          failed: sql`${operations.failed} + ${remaining.length}`,
          finishedAt: sql`now()`,
          heartbeatAt: sql`now()`,
        })
        .where(and(eq(operations.id, operation.id), eq(operations.status, "running")));
      await tx
        .insert(auditLogs)
        .values({
          userId: operation.userId,
          username: operation.username,
          serverId: operation.serverId,
          serverName: operation.serverName,
          host: operation.host,
          action: operation.action,
          result: "failed",
          details,
          ip: operation.ip,
        });
    });
  } finally {
    clearInterval(heartbeat);
  }
};
export const workerTick = async () => {
  // Execuções interrompidas não são repetidas automaticamente: a ação externa pode já ter ocorrido.
  await db().transaction(async (tx) => {
    const stale = await tx
      .select()
      .from(operations)
      .where(
        and(
          eq(operations.status, "running"),
          lt(operations.heartbeatAt, sql`now() - interval '2 minutes'`),
        ),
      )
      .for("update", { skipLocked: true });
    for (const row of stale) {
      const details =
        "Worker interrompido. O resultado externo pode ser incerto; atualize o servidor antes de repetir.";
      await tx
        .update(operationItems)
        .set({ status: "failed", message: details })
        .where(
          and(
            eq(operationItems.operationId, row.id),
            inArray(operationItems.status, ["pending", "running"]),
          ),
        );
      await tx
        .update(operations)
        .set({
          status: "failed",
          failed: row.failed + row.total - row.completed,
          completed: row.total,
          finishedAt: new Date(),
        })
        .where(eq(operations.id, row.id));
      await tx.insert(auditLogs).values({
        userId: row.userId,
        username: row.username,
        serverId: row.serverId,
        serverName: row.serverName,
        host: row.host,
        action: row.action,
        result: "failed",
        details,
      });
    }
  });
  const operation = await db().transaction(async (tx) => {
    const [next] = await tx
      .select()
      .from(operations)
      .where(eq(operations.status, "pending"))
      .orderBy(operations.createdAt)
      .limit(1)
      .for("update", { skipLocked: true });
    if (!next) return null;
    const [claimed] = await tx
      .update(operations)
      .set({ status: "running", startedAt: sql`now()`, heartbeatAt: sql`now()` })
      .where(eq(operations.id, next.id))
      .returning();
    return claimed;
  });
  if (operation) {
    try {
      await processOperation(operation);
    } catch {
      // Se o banco interno falhar, a recuperação considera apenas o heartbeat real.
    }
  }
};
const state = globalThis as unknown as { basecontrolWorker?: boolean };
export const startWorker = () => {
  if (state.basecontrolWorker || !process.env.DATABASE_URL) return;
  state.basecontrolWorker = true;
  const loop = async () => {
    try {
      await workerTick();
    } catch {
      /* A fila persistida será consultada novamente sem expor secrets. */
    }
    setTimeout(loop, 3000).unref();
  };
  void loop();
};
