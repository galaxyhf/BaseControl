import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Engine, OperationStatus } from "@/lib/database/types";
const time = () => timestamp({ withTimezone: true }).notNull().defaultNow();
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text().notNull(),
  passwordHash: text().notNull(),
  createdAt: time(),
});
export const authSessions = pgTable("auth_sessions", {
  id: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});
export const servers = pgTable("servers", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  type: text().$type<Engine>().notNull(),
  host: text().notNull(),
  port: integer().notNull(),
  username: text().notNull(),
  encryptedPassword: text().notNull(),
  initialDatabase: text().notNull().default(""),
  ssl: boolean().notNull().default(true),
  timeout: integer().notNull().default(15),
  status: text().notNull().default("unknown"),
  version: text(),
  databaseCount: integer().notNull().default(0),
  connections: integer().notNull().default(0),
  lastConnectedAt: timestamp({ withTimezone: true }),
  lastUpdatedAt: timestamp({ withTimezone: true }),
  lastError: text(),
  createdAt: time(),
});
export const operations = pgTable(
  "operations",
  {
    id: uuid().primaryKey().defaultRandom(),
    serverId: uuid()
      .notNull()
      .references(() => servers.id),
    serverName: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    username: text().notNull(),
    host: text().notNull(),
    ip: text(),
    action: text().notNull(),
    status: text().$type<OperationStatus>().notNull().default("pending"),
    terminate: boolean().notNull().default(false),
    sessionId: text(),
    total: integer().notNull(),
    completed: integer().notNull().default(0),
    failed: integer().notNull().default(0),
    createdAt: time(),
    startedAt: timestamp({ withTimezone: true }),
    heartbeatAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    uniqueIndex("one_active_operation_per_server")
      .on(table.serverId)
      .where(sql`${table.status} in ('pending', 'running')`),
    index("operations_status_idx").on(table.status),
  ],
);
export const operationItems = pgTable(
  "operation_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationId: uuid()
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    databaseName: text().notNull(),
    status: text().$type<OperationStatus>().notNull().default("pending"),
    message: text(),
    duration: integer(),
  },
  (table) => [index("operation_items_operation_idx").on(table.operationId)],
);
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: time(),
    userId: uuid().references(() => users.id),
    username: text().notNull(),
    serverId: uuid(),
    serverName: text(),
    host: text(),
    databaseName: text(),
    action: text().notNull(),
    result: text().notNull(),
    duration: integer().notNull().default(0),
    details: text(),
    ip: text(),
  },
  (table) => [index("audit_date_idx").on(table.createdAt)],
);
export const settings = pgTable("settings", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  value: jsonb()
    .$type<{ refreshInterval: 0 | 15 | 30 | 60 | 300; theme: "system" | "light" | "dark" }>()
    .notNull(),
});
export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull(),
  resetsAt: timestamp({ withTimezone: true }).notNull(),
});
