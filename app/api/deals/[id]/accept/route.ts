import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, walletTransactions } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getDealForViewer } from "@/lib/deals-access"
import { getWalletSummary } from "@/lib/wallet"
import { notifyOtherParticipants } from "@/lib/notifications"

/** Buyer accepts the deal and pays its price+shipping into escrow — a real, immediate ledger deduction. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const role = await getParticipantRole(id, user.id)
    if (role !== "buyer") {
      return NextResponse.json({ error: "Only the buyer can accept and pay into escrow" }, { status: 403 })
    }

    const dealRows = await db.select().from(deals).where(eq(deals.id, id)).limit(1)
    const deal = dealRows[0]
    if (!deal || deal.status !== "pending") {
      return NextResponse.json(
        { error: "Deal isn't awaiting acceptance (already accepted, cancelled, or not found)" },
        { status: 409 },
      )
    }

    const amount = Number(deal.price) + Number(deal.shippingPrice)
    const wallet = await getWalletSummary(user.id)
    if (wallet.available < amount) {
      return NextResponse.json(
        { error: `Insufficient balance — top up at least ${(amount - wallet.available).toFixed(2)} ${deal.currency} first` },
        { status: 400 },
      )
    }

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deals)
        .set({ status: "escrow", updatedAt: new Date() })
        .where(and(eq(deals.id, id), eq(deals.status, "pending")))
        .returning()
      const dealRow = rows[0]
      if (!dealRow) return null

      await tx.insert(walletTransactions).values({
        userId: user.id,
        type: "escrow_hold",
        amount: (-amount).toFixed(2),
        status: "completed",
        relatedDealId: dealRow.id,
        description: `Escrow hold for "${dealRow.title}"`,
      })

      await notifyOtherParticipants(tx, dealRow.id, user.id, {
        type: "deal",
        title: `"${dealRow.title}" is now in escrow`,
        description: "The buyer paid into escrow — ship when ready.",
        relatedHref: "/dashboard/",
      })

      return dealRow
    })

    if (!updated) {
      return NextResponse.json(
        { error: "Deal isn't awaiting acceptance (already accepted, cancelled, or not found)" },
        { status: 409 },
      )
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/accept failed", error)
    return NextResponse.json({ error: "Failed to accept deal" }, { status: 500 })
  }
}
