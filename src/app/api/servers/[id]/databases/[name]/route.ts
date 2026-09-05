import { z } from "zod";
import { api, readBody } from "@/lib/api";
import { assertOrigin, requireUser, rateLimit } from "@/lib/security/auth";
import { configFor, getServer, withConnectionSlot } from "@/services/server.service";
import { createProvider } from "@/lib/database/provider";
import { enqueueOperation } from "@/services/operation.service";
import { requestIp } from "@/lib/security/request-ip";
type Context = { params: Promise<{ id: string; name: string }> };
export const GET = (_request: Request, context: Context) =>
  api(async () => {
    await requireUser();
    const { id, name } = await context.params;
    const server = await getServer(z.uuid().parse(id));
    return withConnectionSlot(() => createProvider(configFor(server)).getDatabaseInfo(name));
  });
export const DELETE = (request: Request, context: Context) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    await rateLimit(`destructive:${user.id}`);
    const { id, name } = await context.params;
    const input = z
      .object({ confirmation: z.string(), terminate: z.boolean() })
      .parse(await readBody(request));
    return enqueueOperation(
      { ...input, serverId: id, names: [name], action: "DROP_DATABASE" },
      user,
      requestIp(request),
    );
  });
