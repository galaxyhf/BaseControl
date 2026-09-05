import { db } from "@/db";
import { auditLogs } from "@/db/schema";
export type AuditInput = typeof auditLogs.$inferInsert;
export const audit = async (input: AuditInput) => {
  await db().insert(auditLogs).values(input);
};
