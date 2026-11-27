ALTER TABLE "user_moderation_events" DROP CONSTRAINT "user_moderation_action_check";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_deal_id_deals_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "billing_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "invoice_ref" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "invoiced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "can_book_shipments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipments_billing_idx" ON "shipments" USING btree ("user_id","billing_status");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_billing_status_check" CHECK ("shipments"."billing_status" in ('none', 'unbilled', 'invoiced', 'paid'));--> statement-breakpoint
ALTER TABLE "user_moderation_events" ADD CONSTRAINT "user_moderation_action_check" CHECK ("user_moderation_events"."action" in ('restrict', 'suspend', 'reinstate', 'make_admin', 'remove_admin', 'enable_shipping', 'disable_shipping'));