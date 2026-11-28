import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getDealForViewer } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"
import { logDealEvent } from "@/lib/deal-events"

/**
 * Either side records that the parcel arrived (e.g. the seller saw "delivered" on the carrier's site).
 * It doesn't move money: only the buyer's confirmation — or the end of buyer protection — releases it.
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
    if (!role) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deals)
        .set({ deliveredAt: new Date(), updatedAt: new Date() })
        .where(and(eq(deals.id, id), eq(deals.status, "shipped"), isNull(deals.deliveredAt)))
        .returning()
      const deal = rows[0]
      if (!deal) return null

      await logDealEvent(tx, {
        dealId: deal.id,
        actorUserId: user.id,
        type: "delivered",
        message: role === "seller" ? "Seller reported the parcel as delivered" : "Buyer reported the parcel as delivered",
      })
      await notifyOtherParticipants(tx, deal.id, user.id, {
        type: "deal",
        title: `"${deal.title}" was delivered`,
        description:
          role === "seller"
            ? "The seller says your parcel arrived. Check the item and confirm receipt to release the payment."
            : "The buyer received the parcel and is checking the item.",
        relatedHref: "/dashboard/deals/",
      })
      return deal
    })

    if (!updated) {
      return NextResponse.json(
        { error: "Only a shipped deal that isn't marked delivered yet can be marked delivered" },
        { status: 409 },
      )
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/delivered failed", error)
    return NextResponse.json({ error: "Failed to mark as delivered" }, { status: 500 })
  }
}
