import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { walletTransactions } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getWalletSummary, toWalletTransaction, validateAmount } from "@/lib/wallet"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { amount?: unknown }
    const validationError = validateAmount(body.amount)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const amount = body.amount as number

    const summary = await getWalletSummary(user.id)
    if (amount > summary.available) {
      return NextResponse.json(
        { error: `Insufficient available balance (${summary.available.toFixed(2)} available)` },
        { status: 400 },
      )
    }

    const inserted = await db
      .insert(walletTransactions)
      .values({
        userId: user.id,
        type: "withdrawal",
        amount: (-amount).toFixed(2),
        status: "completed",
        description: "Withdrawal (demo — internal ledger only, no real payment provider)",
      })
      .returning()

    return NextResponse.json(toWalletTransaction(inserted[0]), { status: 201 })
  } catch (error) {
    console.error("POST /api/wallet/withdraw failed", error)
    return NextResponse.json({ error: "Failed to withdraw" }, { status: 500 })
  }
}
