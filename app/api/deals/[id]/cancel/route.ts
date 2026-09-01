import { NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, dealParticipants, walletTransactions } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getDealForViewer } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"

/** Either participant can cancel while nothing has shipped yet. Refunds the buyer if they'd already paid. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const role = await getParticipantRole(id, user.id)
    if (!role) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const updated = await db.transaction(async (tx) => {
      const existingRows = await tx.select({ status: deals.status }).from(deals).where(eq(deals.id, id)).limit(1)
      const wasInEscrow = existingRows[0]?.status === "escrow"

      const rows = await tx
        .update(deals)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(deals.id, id), inArray(deals.status, ["pending", "escrow"])))
        .returning()
      const deal = rows[0]
      if (!deal) return null

      if (wasInEscrow) {
        const buyerRows = await tx
          .select({ userId: dealParticipants.userId })
          .from(dealParticipants)
          .where(and(eq(dealParticipants.dealId, deal.id), eq(dealParticipants.role, "buyer")))
          .limit(1)
        const buyerUserId = buyerRows[0]?.userId
        if (buyerUserId) {
          const amount = Number(deal.price) + Number(deal.shippingPrice)
          await tx.insert(walletTransactions).values({
            userId: buyerUserId,
            type: "refund",
            amount: amount.toFixed(2),
            status: "completed",
            relatedDealId: deal.id,
            description: `Refund for cancelled deal — ${deal.title}`,
          })
        }
      }

      await notifyOtherParticipants(tx, deal.id, user.id, {
        type: "deal",
        title: `"${deal.title}" was cancelled`,
        description: wasInEscrow ? "The held funds have been refunded to the buyer." : undefined,
        relatedHref: "/dashboard/",
      })

      return deal
    })

    if (!updated) {
      return NextResponse.json(
        { error: "Deal can only be cancelled while pending or in escrow" },
        { status: 409 },
      )
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/cancel failed", error)
    return NextResponse.json({ error: "Failed to cancel deal" }, { status: 500 })
  }
}
