import { api } from "@/lib/api";
import { rateLimit, requireUser } from "@/lib/security/auth";
import { listServers, searchAllServers } from "@/services/server.service";
import { operationCountToday } from "@/services/operation.service";
export const GET = (request: Request) =>
  api(async () => {
    const user = await requireUser();
    if (new URL(request.url).searchParams.get("refresh") === "true") {
      await rateLimit(`dashboard-refresh:${user.id}`, 6);
      await searchAllServers();
    }
    const [servers, operationsToday] = await Promise.all([listServers(), operationCountToday()]);
    return { servers, operationsToday };
  });
