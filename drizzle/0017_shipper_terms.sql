ALTER TABLE "shipments" ADD COLUMN "billed_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shipping_credit_limit" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shipping_markup_pct" numeric(5, 2) DEFAULT '0' NOT NULL;