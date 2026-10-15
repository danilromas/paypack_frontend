ALTER TABLE "shipments" ADD COLUMN "provider" text DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider_order_code" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "carrier_name" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "tracking_url" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "label_url" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "pickup_date" date;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "sender_address" jsonb;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "receiver_address" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_provider_order_code_idx" ON "shipments" USING btree ("provider_order_code");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_provider_check" CHECK ("shipments"."provider" in ('internal', 'eurosender'));