import { api, readBody } from "@/lib/api";
import { assertOrigin, rateLimit, requireUser } from "@/lib/security/auth";
import { connectionSchema, editConnectionSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { createProvider } from "@/lib/database/provider";
import { safeError } from "@/lib/security/errors";
import { audit } from "@/services/audit.service";
import { configFor, getServer, withConnectionSlot } from "@/services/server.service";
import { requestIp } from "@/lib/security/request-ip";
export const POST = (request: Request) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    await rateLimit(`test:${user.id}`, 10);
    const body = await readBody(request);
    const { serverId } = z.object({ serverId: z.uuid().optional() }).parse(body);
    const saved = serverId ? configFor(await getServer(serverId)) : null;
    const edited = saved ? editConnectionSchema.parse(body) : null;
    const input = connectionSchema.parse(
      edited && saved ? { ...edited, password: edited.password || saved.password } : body,
    );
    const start = Date.now();
    const context = {
      userId: user.id,
      username: user.name,
      serverId,
      serverName: input.name,
      host: input.host,
      action: "TEST_CONNECTION",
      ip: requestIp(request),
    };
    try {
      const result = await withConnectionSlot(() => createProvider(input).testConnection());
      await audit({ ...context, result: "success", duration: Date.now() - start });
      return result;
    } catch (error) {
      await audit({
        ...context,
        result: "failed",
        duration: Date.now() - start,
        details: safeError(error),
      });
      throw error;
    }
  });
