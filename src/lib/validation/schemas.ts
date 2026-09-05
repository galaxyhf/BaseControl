import { z } from "zod";
export const connectionSchema = z.object({
  type: z.enum(["postgres", "sqlserver"]),
  name: z.string().trim().min(1).max(80),
  host: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.:[\]_-]+$/, "Host inválido"),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(1024),
  initialDatabase: z.string().max(128).default(""),
  ssl: z.boolean().default(true),
  timeout: z.number().int().min(3).max(60).default(15),
});
export const editConnectionSchema = connectionSchema.extend({
  password: z.string().max(1024).optional(),
});
export const operationSchema = z.object({
  serverId: z.uuid(),
  action: z.enum(["DROP_DATABASE", "TERMINATE_DATABASE_CONNECTIONS", "TERMINATE_SESSION"]),
  names: z
    .array(z.string().min(1).max(128))
    .min(1)
    .max(1000)
    .refine((v) => new Set(v).size === v.length, "Databases duplicadas"),
  confirmation: z.string().max(256),
  terminate: z.boolean().default(false),
  sessionId: z.string().optional(),
});
export const settingsSchema = z.object({
  refreshInterval: z.union([
    z.literal(0),
    z.literal(15),
    z.literal(30),
    z.literal(60),
    z.literal(300),
  ]),
  theme: z.enum(["system", "light", "dark"]),
});
