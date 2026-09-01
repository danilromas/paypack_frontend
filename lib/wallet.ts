import "server-only"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, walletTransactions } from "@/db/schema"

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
    db
      .select({ total: sql<string>`coalesce(sum(${deals.price} + ${deals.shippingPrice}), 0)` })
      .from(deals)
      .where(
        and(
          eq(deals.userId, userId),
          eq(deals.role, "seller"),
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
  if (amount <= 0) {
    return "Amount must be greater than zero"
  }
  if (amount > 1_000_000) {
    return "Amount is too large"
  }
  return null
}
