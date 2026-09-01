import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, walletTransactions } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getOtherParticipantUserId, getDealForViewer } from "@/lib/deals-access"
import { notifyUser } from "@/lib/notifications"

/** Buyer confirms receipt — the only action that releases the escrowed funds to the seller. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const role = await getParticipantRole(id, user.id)
    if (role !== "buyer") {
      return NextResponse.json({ error: "Only the buyer can confirm receipt" }, { status: 403 })
    }

    const sellerUserId = await getOtherParticipantUserId(id, user.id)
    if (!sellerUserId) {
      return NextResponse.json({ error: "The seller hasn't joined this deal yet" }, { status: 409 })
    }

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deals)
        .set({ status: "completed", updatedAt: new Date() })
        .where(and(eq(deals.id, id), eq(deals.status, "shipped")))
        .returning()
      const deal = rows[0]
      if (!deal) return null

      const amount = Number(deal.price) + Number(deal.shippingPrice)
      await tx.insert(walletTransactions).values({
        userId: sellerUserId,
        type: "payout",
        amount: amount.toFixed(2),
        status: "completed",
        relatedDealId: deal.id,
        description: `Payout for completed deal — ${deal.title}`,
      })

      await notifyUser(tx, {
        userId: sellerUserId,
        type: "wallet",
        title: "Payout received",
        description: `+${amount.toFixed(2)} ${deal.currency} for "${deal.title}"`,
        relatedHref: "/dashboard/wallet/",
      })

      return deal
    })

    if (!updated) {
      return NextResponse.json(
        { error: "Deal hasn't shipped yet (or is already completed/cancelled)" },
        { status: 409 },
      )
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/confirm-receipt failed", error)
    return NextResponse.json({ error: "Failed to confirm receipt" }, { status: 500 })
  }
}
