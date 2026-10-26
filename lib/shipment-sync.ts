import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { notifyUser } from "@/lib/notifications"
import type { ShipmentStatus } from "@/lib/shipments"

const STATUS_RANK = { pending: 0, "in-transit": 1, arrived: 2 } as const

type ShipmentRow = typeof shipments.$inferSelect

/** A carrier's current view of one shipment. Null fields keep whatever we already stored. */
export interface CarrierSnapshot {
  status: ShipmentStatus
  trackingNumber: string | null
  trackingUrl: string | null
  labelUrl: string | null
  carrierName: string | null
  /** Shown in the notification when the status moves. */
  lastMessage: string | null
}

/** Stores a carrier snapshot and notifies the owner when the status moves forward. */
export async function applyCarrierSnapshot(row: ShipmentRow, snapshot: CarrierSnapshot): Promise<ShipmentRow> {
  const current = row.status as keyof typeof STATUS_RANK
  // Never move backwards — carriers occasionally re-emit older events.
  const nextStatus = STATUS_RANK[snapshot.status] > STATUS_RANK[current] ? snapshot.status : current

  return db.transaction(async (tx) => {
    const result = await tx
      .update(shipments)
      .set({
        status: nextStatus,
        trackingNumber: snapshot.trackingNumber ?? row.trackingNumber,
        trackingUrl: snapshot.trackingUrl ?? row.trackingUrl,
        labelUrl: snapshot.labelUrl ?? row.labelUrl,
        carrierName: snapshot.carrierName ?? row.carrierName,
      })
      .where(eq(shipments.id, row.id))
      .returning()

    if (nextStatus !== row.status) {
      await notifyUser(tx, {
        userId: row.userId,
        type: "shipment",
        title: `Shipment ${result[0].trackingNumber} is now ${nextStatus}`,
        description: snapshot.lastMessage ?? `${row.senderLocation} → ${row.receiverLocation}`,
        relatedHref: "/dashboard/shipments/",
      })
    }
    return result[0]
  })
}
