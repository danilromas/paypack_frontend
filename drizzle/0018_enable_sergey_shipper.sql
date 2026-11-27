-- Turns Sergey's account (Massar Shipping) into a shipping account: books labels without the booking
-- password, PayPack invoices him for them. Credit limit 200 EUR keeps his unpaid labels below
-- PayPack's 250 EUR Sendcloud spending limit; adjust it in Admin -> Shipping billing.
-- Only touches an account that already exists; if he hasn't registered yet this is a no-op and
-- `npm run make-shipper -- info@massar-shipping.ee` enables him later.
UPDATE "users"
SET "can_book_shipments" = true,
    "shipping_credit_limit" = coalesce("shipping_credit_limit", 200),
    "updated_at" = now()
WHERE lower("email") = 'info@massar-shipping.ee';
--> statement-breakpoint
INSERT INTO "user_moderation_events" ("user_id", "action", "reason")
SELECT "id", 'enable_shipping', 'Shipping account for Massar Shipping (migration 0018)'
FROM "users"
WHERE lower("email") = 'info@massar-shipping.ee';
