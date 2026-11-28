import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getDealForViewer } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"
import { logDealEvent } from "@/lib/deal-events"
import { BUYER_PROTECTION_DAYS } from "@/lib/deals"

/** Seller marks a paid-for deal as shipped, optionally with tracking info the buyer can see. */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const role = await getParticipantRole(id, user.id)
    if (role !== "seller") {
      return NextResponse.json({ error: "Only the seller can mark this as shipped" }, { status: 403 })
    }

    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const carrier = typeof raw.carrier === "string" && raw.carrier.trim() ? raw.carrier.trim() : null
    const trackingNumber =
      typeof raw.trackingNumber === "string" && raw.trackingNumber.trim() ? raw.trackingNumber.trim() : null
    if ((carrier && carrier.length > 60) || (trackingNumber && trackingNumber.length > 80)) {
      return NextResponse.json({ error: "Carrier or tracking number is too long" }, { status: 400 })
    }

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deals)
        .set({ status: "shipped", carrier, trackingNumber, shippedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(deals.id, id), eq(deals.status, "escrow")))
        .returning()
      const deal = rows[0]
      if (!deal) return null

      const tracking = [carrier, trackingNumber].filter(Boolean).join(" ")
      await logDealEvent(tx, {
        dealId: deal.id,
        actorUserId: user.id,
        type: "shipped",
        message: tracking ? `Shipped — ${tracking}` : "Shipped",
      })

      await notifyOtherParticipants(tx, deal.id, user.id, {
        type: "deal",
        title: `"${deal.title}" has shipped`,
        description: `${tracking ? `Tracking: ${tracking}. ` : ""}Confirm receipt once it arrives — you have ${BUYER_PROTECTION_DAYS} days to confirm or open a dispute.`,
        relatedHref: "/dashboard/deals/",
      })

      return deal
    })

    if (!updated) {
      return NextResponse.json(
        { error: "Deal isn't in escrow (not accepted yet, already shipped, or not found)" },
        { status: 409 },
      )
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/ship failed", error)
    return NextResponse.json({ error: "Failed to mark deal as shipped" }, { status: 500 })
  }
}
