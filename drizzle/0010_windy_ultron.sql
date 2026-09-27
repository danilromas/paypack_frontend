CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"rater_user_id" uuid NOT NULL,
	"rated_user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_score_check" CHECK ("ratings"."score" >= 1 and "ratings"."score" <= 5)
);
--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_user_id_users_id_fk" FOREIGN KEY ("rater_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rated_user_id_users_id_fk" FOREIGN KEY ("rated_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_deal_rater_idx" ON "ratings" USING btree ("deal_id","rater_user_id");--> statement-breakpoint
CREATE INDEX "ratings_rated_user_id_idx" ON "ratings" USING btree ("rated_user_id");