import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getDealForViewer } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"
import { logDealEvent } from "@/lib/deal-events"
import { parseDeliveryAddress, validateDeliveryAddress } from "@/lib/deals"

/** The buyer corrects the delivery address — only while the seller hasn't shipped yet. */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const role = await getParticipantRole(id, user.id)
    if (role !== "buyer") {
      return NextResponse.json({ error: "Only the buyer can change the delivery address" }, { status: 403 })
    }

    const body = (await req.json().catch(() => ({}))) as { delivery?: unknown }
    const delivery = parseDeliveryAddress(body.delivery)
    const error = validateDeliveryAddress(delivery)
    if (error || !delivery) {
      return NextResponse.json({ error: error ?? "Add a delivery address" }, { status: 400 })
    }

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deals)
        .set({
          deliveryName: delivery.name,
          deliveryPhone: delivery.phone || null,
          deliveryStreet: delivery.street,
          deliveryCity: delivery.city,
          deliveryPostcode: delivery.postcode,
          deliveryCountry: delivery.country,
          deliveryNote: delivery.note || null,
          updatedAt: new Date(),
        })
        .where(and(eq(deals.id, id), eq(deals.status, "escrow")))
        .returning()
      const deal = rows[0]
      if (!deal) return null

      await logDealEvent(tx, {
        dealId: deal.id,
        actorUserId: user.id,
        type: "address_updated",
        message: `Delivery address changed to ${delivery.city}, ${delivery.country}`,
      })
      await notifyOtherParticipants(tx, deal.id, user.id, {
        type: "deal",
        title: `New delivery address for "${deal.title}"`,
        description: `Ship to ${delivery.street}, ${delivery.postcode} ${delivery.city}, ${delivery.country}.`,
        relatedHref: "/dashboard/deals/",
      })
      return deal
    })

    if (!updated) {
      return NextResponse.json(
        { error: "The address can only be changed after paying and before the seller ships" },
        { status: 409 },
      )
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("PUT /api/deals/[id]/delivery failed", error)
    return NextResponse.json({ error: "Failed to update the delivery address" }, { status: 500 })
  }
}
