import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { api, readBody } from "@/lib/api";
import { assertOrigin, requireUser } from "@/lib/security/auth";
import { settingsSchema } from "@/lib/validation/schemas";
export const GET = () =>
  api(async () => {
    const user = await requireUser();
    const [row] = await db().select().from(settings).where(eq(settings.userId, user.id));
    return row?.value || { refreshInterval: 30, theme: "system" };
  });
export const PUT = (request: Request) =>
  api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    const value = settingsSchema.parse(await readBody(request));
    await db()
      .insert(settings)
      .values({ userId: user.id, value })
      .onConflictDoUpdate({ target: settings.userId, set: { value } });
    return value;
  });
