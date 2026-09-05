import { api, readBody } from "@/lib/api";
import { assertOrigin, rateLimit, requireUser } from "@/lib/security/auth";
import { enqueueOperation, listOperations } from "@/services/operation.service";
import { requestIp } from "@/lib/security/request-ip";
export const GET = () =>
  api(async () => {
    await requireUser();
    return listOperations();
  });
export const POST = (request: Request) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    await rateLimit(`destructive:${user.id}`);
    return enqueueOperation(await readBody(request), user, requestIp(request));
  });
