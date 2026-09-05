import { api } from "@/lib/api";
import { rateLimit, requireUser } from "@/lib/security/auth";
import { searchAllServers } from "@/services/server.service";
export const GET = () =>
  api(async () => {
    const user = await requireUser();
    await rateLimit(`search:${user.id}`, 6);
    return searchAllServers();
  });
