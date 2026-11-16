CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"action" varchar(100) NOT NULL,
	"entity_name" varchar(50) NOT NULL,
	"entity_id" varchar(36) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"digest" varchar(100),
	"fingerprint" varchar(40) NOT NULL,
	"source" varchar(20) NOT NULL,
	"error_name" varchar(100),
	"message" varchar(1000) NOT NULL,
	"stack" text,
	"action_name" varchar(150),
	"path" varchar(500),
	"method" varchar(10),
	"app_version" varchar(40),
	"user_id" varchar(36),
	"role" varchar(20),
	"user_agent" varchar(200),
	"context" jsonb,
	"status" varchar(10) DEFAULT 'NEW' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolver_user_id" varchar(36),
	"note" varchar(500),
	CONSTRAINT "ck_error_logs_status" CHECK ("error_logs"."status" IN ('NEW', 'RESOLVED', 'IGNORED')),
	CONSTRAINT "ck_error_logs_source" CHECK ("error_logs"."source" IN ('SERVER_ACTION', 'PAGE', 'ROUTE', 'CRON', 'CLIENT', 'EXTERNAL'))
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(100) NOT NULL,
	"ip_address" varchar(45),
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"kind" varchar(30) NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" varchar(300),
	"href" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"device_id" varchar(36) NOT NULL,
	"device_label" varchar(120) NOT NULL,
	"ip_address" varchar(45),
	"location" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"phone_number" varchar(20),
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(36),
	"updated_by" varchar(36),
	"deleted_at" timestamp with time zone,
	"deleted_by" varchar(36),
	CONSTRAINT "ck_users_role" CHECK ("role" IN ('DEVELOPER', 'ADMIN', 'USER'))
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity_name_entity_id" ON "audit_logs" USING btree ("entity_name","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_error_logs_created_at" ON "error_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_error_logs_fingerprint_created_at" ON "error_logs" USING btree ("fingerprint","created_at");--> statement-breakpoint
CREATE INDEX "idx_error_logs_digest" ON "error_logs" USING btree ("digest");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_email_created_at" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_ip_address_created_at" ON "login_attempts" USING btree ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id_read_at_created_at" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id_created_at" ON "sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" USING btree ("email") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_role_developer" ON "users" USING btree ("role") WHERE "users"."role" = 'DEVELOPER' AND "users"."deleted_at" IS NULL;