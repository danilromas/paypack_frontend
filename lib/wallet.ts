import "server-only"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, walletTransactions } from "@/db/schema"

export type WalletTxType = "topup" | "withdrawal" | "payout"
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

const SELLER_PENDING_STATUSES = ["escrow", "shipped", "in-transit", "delivered"] as const

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const [[balanceRow], [inEscrowRow], [pendingPayoutRow], operationRows] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${walletTransactions.amount}), 0)` })
      .from(walletTransactions)
      .where(and(eq(walletTransactions.userId, userId), eq(walletTransactions.status, "completed"))),
    db
      .select({ total: sql<string>`coalesce(sum(${deals.price} + ${deals.shippingPrice}), 0)` })
      .from(deals)
      .where(and(eq(deals.userId, userId), eq(deals.role, "buyer"), eq(deals.status, "escrow"))),
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
    available: balance - inEscrow,
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
