import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, rateLimits, users } from "@/db/schema";
import { AppError } from "./errors";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const cookieName = "basecontrol_session";
export const getUser = async () => {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const [row] = await db()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.id, digest(token)), gt(authSessions.expiresAt, new Date())));
  return row || null;
};
export const requireUser = async () => {
  const user = await getUser();
  if (!user) throw new AppError("Entre na sua conta para continuar.", 401);
  return user;
};
export const createSession = async (userId: string) => {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db()
    .insert(authSessions)
    .values({ id: digest(token), userId, expiresAt: expires });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires,
  });
};
export const logout = async () => {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token)
    await db()
      .delete(authSessions)
      .where(eq(authSessions.id, digest(token)));
  jar.delete(cookieName);
};
export const assertOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || "http://localhost:3000";
  if (!origin || origin !== new URL(expected).origin)
    throw new AppError("Origem da requisição não autorizada.", 403);
  if (process.env.NODE_ENV === "production" && !expected.startsWith("https://"))
    throw new AppError("APP_URL deve usar HTTPS em produção.", 503);
};
export const rateLimit = async (key: string, limit = 10, seconds = 60) => {
  const resetsAt = new Date(Date.now() + seconds * 1000);
  const [row] = await db()
    .insert(rateLimits)
    .values({ key, count: 1, resetsAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetsAt} < now() THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetsAt: sql`CASE WHEN ${rateLimits.resetsAt} < now() THEN ${resetsAt.toISOString()}::timestamptz ELSE ${rateLimits.resetsAt} END`,
      },
    })
    .returning();
  if (row.count > limit)
    throw new AppError("Muitas tentativas. Aguarde um minuto antes de tentar novamente.", 429);
};
