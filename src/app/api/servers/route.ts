import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { auditLogs, servers } from "@/db/schema";
import { api, readBody } from "@/lib/api";
import { assertOrigin, rateLimit, requireUser } from "@/lib/security/auth";
import { connectionSchema } from "@/lib/validation/schemas";
import { encrypt } from "@/lib/encryption/credentials";
import { assertAllowedHost } from "@/lib/security/network";
import { listServers, publicColumns } from "@/services/server.service";
export const GET = () =>
  api(async () => {
    await requireUser();
    return listServers();
  });
export const POST = (request: Request) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    await rateLimit(`server:${user.id}`, 20);
    const { password, ...input } = connectionSchema.parse(await readBody(request));
    assertAllowedHost(input.host);
    const id = randomUUID();
    return db().transaction(async (tx) => {
      const [server] = await tx
        .insert(servers)
        .values({ ...input, id, encryptedPassword: encrypt(password, id) })
        .returning(publicColumns);
      await tx.insert(auditLogs).values({
        userId: user.id,
        username: user.name,
        serverId: id,
        serverName: input.name,
        host: input.host,
        action: "CREATE_SERVER",
        result: "success",
      });
      return server;
    });
  });
