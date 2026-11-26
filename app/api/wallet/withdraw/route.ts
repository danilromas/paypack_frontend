import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { walletTransactions } from "@/db/schema"
import { getCurrentUser, restrictionError } from "@/lib/auth/session"
import { getAvailableBalance, lockWallet, toWalletTransaction, validateAmount } from "@/lib/wallet"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const restricted = restrictionError(user)
  if (restricted) {
    return NextResponse.json(restricted, { status: 403 })
  }

  try {
    const body = (await req.json()) as { amount?: unknown }
    const validationError = validateAmount(body.amount)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const amount = body.amount as number

    // Lock + re-read the balance inside one transaction so parallel withdrawals can't overdraw.
    const result = await db.transaction(async (tx) => {
      await lockWallet(tx, user.id)
      const available = await getAvailableBalance(tx, user.id)
      if (amount > available) return { ok: false as const, available }
      const rows = await tx
        .insert(walletTransactions)
        .values({
          userId: user.id,
          type: "withdrawal",
          amount: (-amount).toFixed(2),
          status: "completed",
          description: "Withdrawal (demo — internal ledger only, no real payment provider)",
        })
        .returning()
      return { ok: true as const, row: rows[0] }
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: `Insufficient available balance (${result.available.toFixed(2)} available)` },
        { status: 400 },
      )
    }

    return NextResponse.json(toWalletTransaction(result.row), { status: 201 })
  } catch (error) {
    console.error("POST /api/wallet/withdraw failed", error)
    return NextResponse.json({ error: "Failed to withdraw" }, { status: 500 })
  }
}
