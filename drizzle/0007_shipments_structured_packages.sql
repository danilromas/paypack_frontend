-- Shipments move from free-text service/dimensions/weight to structured, priced fields.
-- Demo-scale data, no reliable way to backfill "30x20x15 cm" into separate numeric columns.
TRUNCATE TABLE "shipments";--> statement-breakpoint
ALTER TABLE "shipments" DROP COLUMN "service";--> statement-breakpoint
ALTER TABLE "shipments" DROP COLUMN "dimensions";--> statement-breakpoint
ALTER TABLE "shipments" DROP COLUMN "weight";--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "service_tier" text NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "weight_kg" numeric(6, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "length_cm" numeric(6, 1) NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "width_cm" numeric(6, 1) NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "height_cm" numeric(6, 1) NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "estimated_cost" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "estimated_currency" text DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "tracking_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_tier_check" CHECK ("shipments"."service_tier" in ('economy', 'standard', 'express'));
