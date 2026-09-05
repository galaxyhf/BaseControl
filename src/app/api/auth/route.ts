import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { api, readBody } from "@/lib/api";
import { assertOrigin, createSession, logout, rateLimit } from "@/lib/security/auth";
import { verifyPassword } from "@/lib/security/passwords";
import { AppError } from "@/lib/security/errors";
export const POST = (request: Request) =>
  api(async () => {
    assertOrigin(request);
    const input = z
      .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
      .parse(await readBody(request));
    await rateLimit("login:global", 30);
    await rateLimit(`login:${input.email.toLowerCase()}`, 5);
    const [user] = await db()
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()));
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash || `${"0".repeat(32)}:${"0".repeat(128)}`,
    );
    if (!user || !valid) throw new AppError("Email ou senha incorretos.", 401);
    await createSession(user.id);
    return { ok: true };
  });
export const DELETE = (request: Request) =>
  api(async () => {
    assertOrigin(request);
    await logout();
    return { ok: true };
  });
