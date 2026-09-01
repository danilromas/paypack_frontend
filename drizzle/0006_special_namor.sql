ALTER TABLE "deals" DROP CONSTRAINT "deals_status_check";--> statement-breakpoint
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_tx_type_check";--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_status_check" CHECK ("deals"."status" in ('pending', 'escrow', 'shipped', 'completed', 'disputed', 'cancelled'));--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_tx_type_check" CHECK ("wallet_transactions"."type" in ('topup', 'withdrawal', 'payout', 'escrow_hold', 'refund'));