import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { servers } from "@/db/schema";
import { api } from "@/lib/api";
import { assertOrigin, rateLimit, requireUser } from "@/lib/security/auth";
import { refreshServer, getServer, withConnectionSlot } from "@/services/server.service";
import { audit } from "@/services/audit.service";
import { requestIp } from "@/lib/security/request-ip";
type Context = { params: Promise<{ id: string }> };
export const POST = (request: Request, context: Context) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    await rateLimit(`connect:${user.id}`, 20);
    const id = z.uuid().parse((await context.params).id);
    const start = Date.now();
    const result = await withConnectionSlot(() => refreshServer(id));
    await audit({
      userId: user.id,
      username: user.name,
      serverId: id,
      serverName: result.server.name,
      host: result.server.host,
      action: "CONNECT",
      ip: requestIp(request),
      result: result.error ? "failed" : "success",
      details: result.error,
      duration: Date.now() - start,
    });
    return result;
  });
export const DELETE = (request: Request, context: Context) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    const id = z.uuid().parse((await context.params).id);
    const server = await getServer(id);
    await db().update(servers).set({ status: "disconnected" }).where(eq(servers.id, id));
    await audit({
      userId: user.id,
      username: user.name,
      serverId: id,
      serverName: server.name,
      host: server.host,
      action: "DISCONNECT",
      ip: requestIp(request),
      result: "success",
    });
    return { ok: true };
  });
