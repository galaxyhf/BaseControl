import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/security/auth";
import { z } from "zod";
export const GET = (request: Request) =>
  api(async () => {
    await requireUser();
    const params = new URL(request.url).searchParams;
    const filters = [];
    for (const [key, column] of [
      ["server", auditLogs.serverName],
      ["database", auditLogs.databaseName],
      ["user", auditLogs.username],
    ] as const) {
      const value = params.get(key);
      if (value) filters.push(ilike(column, `%${value.slice(0, 128)}%`));
    }
    if (params.get("action")) filters.push(eq(auditLogs.action, params.get("action")!));
    if (params.get("status")) filters.push(eq(auditLogs.result, params.get("status")!));
    if (params.get("from"))
      filters.push(
        gte(
          auditLogs.createdAt,
          new Date(z.iso.date().parse(params.get("from")) + "T00:00:00-03:00"),
        ),
      );
    if (params.get("to"))
      filters.push(
        lte(
          auditLogs.createdAt,
          new Date(z.iso.date().parse(params.get("to")) + "T23:59:59.999-03:00"),
        ),
      );
    const page = Math.max(0, Math.min(100000, Number(params.get("page")) || 0));
    return db()
      .select()
      .from(auditLogs)
      .where(and(...filters))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50)
      .offset(page * 50);
  });
