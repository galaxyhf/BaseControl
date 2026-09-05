CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"userId" uuid,
	"username" text NOT NULL,
	"serverId" uuid,
	"serverName" text,
	"host" text,
	"databaseName" text,
	"action" text NOT NULL,
	"result" text NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"details" text,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operationId" uuid NOT NULL,
	"databaseName" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serverId" uuid NOT NULL,
	"serverName" text NOT NULL,
	"userId" uuid NOT NULL,
	"username" text NOT NULL,
	"host" text NOT NULL,
	"ip" text,
	"action" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"terminate" boolean DEFAULT false NOT NULL,
	"sessionId" text,
	"total" integer NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"startedAt" timestamp with time zone,
	"heartbeatAt" timestamp with time zone,
	"finishedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"resetsAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"username" text NOT NULL,
	"encryptedPassword" text NOT NULL,
	"initialDatabase" text DEFAULT '' NOT NULL,
	"ssl" boolean DEFAULT true NOT NULL,
	"timeout" integer DEFAULT 15 NOT NULL,
	"status" text DEFAULT 'unknown' NOT NULL,
	"version" text,
	"databaseCount" integer DEFAULT 0 NOT NULL,
	"connections" integer DEFAULT 0 NOT NULL,
	"lastConnectedAt" timestamp with time zone,
	"lastUpdatedAt" timestamp with time zone,
	"lastError" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"passwordHash" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_items" ADD CONSTRAINT "operation_items_operationId_operations_id_fk" FOREIGN KEY ("operationId") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_serverId_servers_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_date_idx" ON "audit_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "operation_items_operation_idx" ON "operation_items" USING btree ("operationId");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_operation_per_server" ON "operations" USING btree ("serverId") WHERE "operations"."status" in ('pending', 'running');--> statement-breakpoint
CREATE INDEX "operations_status_idx" ON "operations" USING btree ("status");