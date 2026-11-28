import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { and, eq, isNotNull, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, walletTransactions } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getOtherParticipantUserId, getDealForViewer } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"
import { logDealEvent } from "@/lib/deal-events"
import { BUYER_PROTECTION_DAYS, releaseAvailableAt } from "@/lib/deals"

/**
 * The seller releases the escrow to themselves once buyer protection has run out without the buyer
 * confirming or disputing. Keeps a deal from getting stuck forever when the buyer goes silent.
 */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const role = await getParticipantRole(id, user.id)
    if (role !== "seller") {
      return NextResponse.json({ error: "Only the seller can release the payment" }, { status: 403 })
    }
    const buyerUserId = await getOtherParticipantUserId(id, user.id)
    if (!buyerUserId) {
      return NextResponse.json({ error: "The buyer isn't on this deal" }, { status: 409 })
    }

    const cutoff = new Date(Date.now() - BUYER_PROTECTION_DAYS * 24 * 60 * 60 * 1000)
    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deals)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(deals.id, id),
            eq(deals.status, "shipped"),
            isNotNull(deals.shippedAt),
            lte(deals.shippedAt, cutoff),
          ),
        )
        .returning()
      const deal = rows[0]
      if (!deal) return null

      const amount = Number(deal.price) + Number(deal.shippingPrice)
      await tx.insert(walletTransactions).values({
        userId: user.id,
        type: "payout",
        amount: amount.toFixed(2),
        status: "completed",
        relatedDealId: deal.id,
        description: `Payout after buyer protection ended — ${deal.title}`,
      })
      await logDealEvent(tx, {
        dealId: deal.id,
        actorUserId: user.id,
        type: "auto_released",
        message: `Buyer protection ended — ${amount.toFixed(2)} ${deal.currency} released to the seller`,
      })
      await notifyOtherParticipants(tx, deal.id, user.id, {
        type: "deal",
        title: `"${deal.title}" was completed`,
        description: `Buyer protection ended after ${BUYER_PROTECTION_DAYS} days, so the payment went to the seller.`,
        relatedHref: "/dashboard/deals/",
      })
      return deal
    })

    if (!updated) {
      const current = await db.select({ status: deals.status, shippedAt: deals.shippedAt }).from(deals).where(eq(deals.id, id)).limit(1)
      const availableAt = releaseAvailableAt(current[0]?.shippedAt)
      const message =
        current[0]?.status === "shipped" && availableAt
          ? `You can release the payment from ${availableAt.toISOString().slice(0, 10)}, unless the buyer confirms earlier`
          : "Only a shipped deal can be released"
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/release failed", error)
    return NextResponse.json({ error: "Failed to release the payment" }, { status: 500 })
  }
}
