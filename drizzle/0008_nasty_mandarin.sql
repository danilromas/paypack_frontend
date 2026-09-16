ALTER TABLE "deals" ADD COLUMN "carrier" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "tracking_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX "deal_participants_deal_role_joined_idx" ON "deal_participants" USING btree ("deal_id","role") WHERE "deal_participants"."user_id" is not null;