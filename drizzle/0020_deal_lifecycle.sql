CREATE TABLE "deal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"type" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivery_name" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivery_phone" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivery_street" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivery_city" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivery_postcode" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivery_country" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivery_note" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_events_deal_id_idx" ON "deal_events" USING btree ("deal_id","created_at");--> statement-breakpoint
INSERT INTO "deal_events" ("deal_id", "actor_user_id", "type", "message", "created_at")
SELECT "id", "user_id", 'created', 'Deal created', "created_at" FROM "deals";
