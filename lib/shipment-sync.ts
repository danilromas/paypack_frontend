import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { notifyUser } from "@/lib/notifications"
import type { ShipmentStatus } from "@/lib/shipments"

const STATUS_RANK = { pending: 0, "in-transit": 1, "ready-for-pickup": 2, arrived: 3 } as const

const STATUS_TEXT: Record<ShipmentStatus, string> = {
  pending: "ready to ship",
  "in-transit": "in transit",
  "ready-for-pickup": "ready for pickup",
  arrived: "delivered",
}

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
  // Never move backwards — carriers occasionally re-emit older events (checked on the fresh row below).
  return db.transaction(async (tx) => {
    // Re-read under a row lock: a webhook and a list refresh can sync the same shipment at once, and
    // the row we were handed may be stale — deciding from it could move the status backwards.
    const fresh = (await tx.select().from(shipments).where(eq(shipments.id, row.id)).limit(1).for("update"))[0] ?? row
    const freshStatus = fresh.status as keyof typeof STATUS_RANK
    const nextStatus =
      STATUS_RANK[snapshot.status] > (STATUS_RANK[freshStatus] ?? -1) ? snapshot.status : freshStatus

    const result = await tx
      .update(shipments)
      .set({
        status: nextStatus,
        trackingNumber: snapshot.trackingNumber ?? fresh.trackingNumber,
        trackingUrl: snapshot.trackingUrl ?? fresh.trackingUrl,
        labelUrl: snapshot.labelUrl ?? fresh.labelUrl,
        carrierName: snapshot.carrierName ?? fresh.carrierName,
      })
      .where(eq(shipments.id, row.id))
      .returning()

    if (nextStatus !== fresh.status) {
      await notifyUser(tx, {
        userId: row.userId,
        type: "shipment",
        title: `Shipment ${result[0].trackingNumber} is now ${STATUS_TEXT[nextStatus as ShipmentStatus] ?? nextStatus}`,
        description: snapshot.lastMessage ?? `${row.senderLocation} → ${row.receiverLocation}`,
        relatedHref: "/dashboard/shipments/",
      })
    }
    return result[0]
  })
}
