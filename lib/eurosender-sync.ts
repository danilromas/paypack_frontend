import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { notifyUser } from "@/lib/notifications"
import { getOrder, getTracking, mapTrackingStatus } from "@/lib/eurosender"

const STATUS_RANK = { pending: 0, "in-transit": 1, arrived: 2 } as const

type ShipmentRow = typeof shipments.$inferSelect

/**
 * Re-reads an order's state from Eurosender and stores it. Webhook bodies are never trusted directly —
 * Eurosender doesn't document its signature scheme — so every update goes through this API fetch.
 */
export async function syncEurosenderShipment(row: ShipmentRow): Promise<ShipmentRow> {
  if (row.provider !== "eurosender" || !row.providerOrderCode) return row

  const [order, tracking] = await Promise.all([
    getOrder(row.providerOrderCode),
    getTracking(row.providerOrderCode).catch(() => null),
  ])

  const mapped = mapTrackingStatus(tracking?.status ?? null)
  const current = row.status as keyof typeof STATUS_RANK
  // Never move backwards — carriers occasionally re-emit older events.
  const nextStatus = STATUS_RANK[mapped] > STATUS_RANK[current] ? mapped : current

  const updated = await db.transaction(async (tx) => {
    const result = await tx
      .update(shipments)
      .set({
        status: nextStatus,
        trackingNumber: tracking?.trackingNumber ?? order.trackingNumber ?? row.trackingNumber,
        trackingUrl: order.trackingUrl ?? row.trackingUrl,
        labelUrl: order.labelUrl ?? row.labelUrl,
        carrierName: order.carrierName ?? row.carrierName,
      })
      .where(eq(shipments.id, row.id))
      .returning()

    if (nextStatus !== row.status) {
      await notifyUser(tx, {
        userId: row.userId,
        type: "shipment",
        title: `Shipment ${result[0].trackingNumber} is now ${nextStatus}`,
        description: tracking?.lastMessage ?? `${row.senderLocation} → ${row.receiverLocation}`,
        relatedHref: "/dashboard/shipments/",
      })
    }
    return result[0]
  })

  return updated
}
