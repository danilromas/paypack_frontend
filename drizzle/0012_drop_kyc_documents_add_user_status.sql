ALTER TABLE "kyc_documents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "kyc_documents" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'restricted', 'suspended'));