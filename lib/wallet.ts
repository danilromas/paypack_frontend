import "server-only"
import type { PgTransaction } from "drizzle-orm/pg-core"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealParticipants, deals, walletTransactions } from "@/db/schema"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = PgTransaction<any, any, any>

/**
 * Serialises every balance-changing operation of one user for the rest of the transaction, so two
 * concurrent withdrawals/escrow payments can't both pass the same balance check.
 */
export async function lockWallet(tx: Tx, userId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`wallet:${userId}`}, 0))`)
}

/** The user's spendable balance, read inside the given transaction (call lockWallet first). */
export async function getAvailableBalance(tx: Tx, userId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${walletTransactions.amount}), 0)` })
    .from(walletTransactions)
    .where(and(eq(walletTransactions.userId, userId), eq(walletTransactions.status, "completed")))
  return Number(row.total)
}

export type WalletTxType = "topup" | "withdrawal" | "payout" | "escrow_hold" | "refund"
export type WalletTxStatus = "pending" | "processing" | "completed" | "failed"

export interface WalletTransactionDTO {
  id: string
  type: WalletTxType
  amount: number
  status: WalletTxStatus
  relatedDealId: string | null
  description: string
  createdAt: string
}

export interface WalletSummary {
  balance: number
  inEscrow: number
  pendingPayout: number
  available: number
  operations: WalletTransactionDTO[]
}

type WalletTxRow = typeof walletTransactions.$inferSelect

export function toWalletTransaction(row: WalletTxRow): WalletTransactionDTO {
  return {
    id: row.id,
    type: row.type as WalletTxType,
    amount: Number(row.amount),
    status: row.status as WalletTxStatus,
    relatedDealId: row.relatedDealId,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }
}

// Deal statuses where a buyer's escrow_hold is still "live" (not yet released as a payout, not refunded).
const HOLD_STILL_TIED_UP_STATUSES = ["escrow", "shipped", "disputed"] as const
const SELLER_PENDING_STATUSES = ["escrow", "shipped"] as const

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const [[balanceRow], [inEscrowRow], [pendingPayoutRow], operationRows] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${walletTransactions.amount}), 0)` })
      .from(walletTransactions)
      .where(and(eq(walletTransactions.userId, userId), eq(walletTransactions.status, "completed"))),
    // Real held funds: escrow_hold rows whose deal hasn't been completed/cancelled yet — a display
    // breakdown of `balance`, not something subtracted from it again (the hold already left the balance).
    db
      .select({ total: sql<string>`coalesce(sum(-${walletTransactions.amount}), 0)` })
      .from(walletTransactions)
      .innerJoin(deals, eq(deals.id, walletTransactions.relatedDealId))
      .where(
        and(
          eq(walletTransactions.userId, userId),
          eq(walletTransactions.type, "escrow_hold"),
          eq(walletTransactions.status, "completed"),
          inArray(deals.status, HOLD_STILL_TIED_UP_STATUSES),
        ),
      ),
    // Not yet a real transaction (no payout row exists until the buyer confirms receipt) — genuinely
    // has to be computed live from the seller's in-flight deals.
    // Seller side via deal_participants — covers deals the user created *and* ones they joined
    // by invite link or received through the checkout widget.
    db
      .select({ total: sql<string>`coalesce(sum(${deals.price} + ${deals.shippingPrice}), 0)` })
      .from(deals)
      .innerJoin(dealParticipants, eq(dealParticipants.dealId, deals.id))
      .where(
        and(
          eq(dealParticipants.userId, userId),
          eq(dealParticipants.role, "seller"),
          inArray(deals.status, SELLER_PENDING_STATUSES),
        ),
      ),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt)),
  ])

  const balance = Number(balanceRow.total)
  const inEscrow = Number(inEscrowRow.total)
  const pendingPayout = Number(pendingPayoutRow.total)

  return {
    balance,
    inEscrow,
    pendingPayout,
    // `balance` already reflects every real hold/payout/refund — nothing left to subtract.
    available: balance,
    operations: operationRows.map(toWalletTransaction),
  }
}

export function validateAmount(amount: unknown): string | null {
  if (typeof amount !== "number" || Number.isNaN(amount) || !Number.isFinite(amount)) {
    return "Invalid amount"
  }
  if (amount < 0.01) {
    return "Amount must be at least 0.01"
  }
  if (Math.round(amount * 100) / 100 !== amount) {
    return "Amount can have at most 2 decimals"
  }
  if (amount > 1_000_000) {
    return "Amount is too large"
  }
  return null
}
