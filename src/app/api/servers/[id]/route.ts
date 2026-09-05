import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, servers } from "@/db/schema";
import { api, readBody } from "@/lib/api";
import { assertOrigin, requireUser } from "@/lib/security/auth";
import { editConnectionSchema } from "@/lib/validation/schemas";
import { encrypt } from "@/lib/encryption/credentials";
import { assertAllowedHost } from "@/lib/security/network";
import { AppError } from "@/lib/security/errors";
import { publicColumns, refreshServer, withConnectionSlot } from "@/services/server.service";
import { assertNoActiveOperations } from "@/services/operation.service";
type Context = { params: Promise<{ id: string }> };
export const GET = (_request: Request, context: Context) =>
  api(async () => {
    await requireUser();
    const id = z.uuid().parse((await context.params).id);
    return withConnectionSlot(() => refreshServer(id));
  });
export const PATCH = (request: Request, context: Context) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    const id = z.uuid().parse((await context.params).id);
    const { password, ...input } = editConnectionSchema.parse(await readBody(request));
    assertAllowedHost(input.host);
    return db().transaction(async (tx) => {
      const [old] = await tx.select().from(servers).where(eq(servers.id, id)).for("update");
      if (!old || old.status === "removed") throw new AppError("Servidor não encontrado.", 404);
      await assertNoActiveOperations(id);
      const [server] = await tx
        .update(servers)
        .set({
          ...input,
          ...(password ? { encryptedPassword: encrypt(password, id) } : {}),
          status: "unknown",
          version: null,
          databaseCount: 0,
          connections: 0,
          lastError: null,
          lastUpdatedAt: null,
        })
        .where(eq(servers.id, id))
        .returning(publicColumns);
      await tx.insert(auditLogs).values({
        userId: user.id,
        username: user.name,
        serverId: id,
        serverName: input.name,
        host: input.host,
        action: "UPDATE_SERVER",
        result: "success",
      });
      return server;
    });
  });
export const DELETE = (request: Request, context: Context) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    const id = z.uuid().parse((await context.params).id);
    const input = z.object({ confirmation: z.string() }).parse(await readBody(request));
    return db().transaction(async (tx) => {
      const [server] = await tx.select().from(servers).where(eq(servers.id, id)).for("update");
      if (!server) throw new AppError("Servidor não encontrado.", 404);
      if (input.confirmation !== server.name)
        throw new AppError("Digite o nome exato do servidor.");
      await assertNoActiveOperations(id);
      // Histórico de operações e auditoria é preservado; apenas o cadastro é arquivado.
      await tx
        .update(servers)
        .set({ status: "removed", encryptedPassword: "", host: server.host })
        .where(eq(servers.id, id));
      await tx.insert(auditLogs).values({
        userId: user.id,
        username: user.name,
        serverId: id,
        serverName: server.name,
        host: server.host,
        action: "REMOVE_SERVER",
        result: "success",
        details: "Cadastro removido. Nenhuma database externa foi excluída.",
      });
      return { ok: true };
    });
  });
