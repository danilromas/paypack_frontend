import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { toShipment } from "@/lib/shipments"
import { getCurrentUser } from "@/lib/auth/session"
import { notifyUser } from "@/lib/notifications"
import { syncEurosenderShipment } from "@/lib/eurosender-sync"
import { EurosenderError } from "@/lib/eurosender"
import { syncSendcloudShipment } from "@/lib/sendcloud-sync"
import { SendcloudError } from "@/lib/sendcloud"

const NEXT_STATUS: Record<string, string | undefined> = {
  pending: "in-transit",
  "in-transit": "arrived",
}

/**
 * Moves a shipment one step forward in its tracking timeline — pending → in-transit → arrived.
 * Real carrier shipments can't be advanced by hand; for those this re-syncs status from the broker.
 */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params

    const owned = await db
      .select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.userId, user.id)))
      .limit(1)
    if (owned[0]?.provider === "eurosender") {
      return NextResponse.json(toShipment(await syncEurosenderShipment(owned[0])))
    }
    if (owned[0]?.provider === "sendcloud") {
      return NextResponse.json(toShipment(await syncSendcloudShipment(owned[0])))
    }

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(shipments)
        .where(and(eq(shipments.id, id), eq(shipments.userId, user.id)))
        .limit(1)
      const shipment = rows[0]
      if (!shipment) return null

      const nextStatus = NEXT_STATUS[shipment.status]
      if (!nextStatus) return "terminal" as const

      const result = await tx
        .update(shipments)
        .set({ status: nextStatus })
        .where(eq(shipments.id, id))
        .returning()

      await notifyUser(tx, {
        userId: user.id,
        type: "shipment",
        title: `Shipment ${shipment.trackingNumber} is now ${nextStatus}`,
        description: `${shipment.senderLocation} → ${shipment.receiverLocation}`,
        relatedHref: "/dashboard/shipments/",
      })

      return result[0]
    })

    if (updated === null) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }
    if (updated === "terminal") {
      return NextResponse.json({ error: "Shipment has already arrived" }, { status: 409 })
    }

    return NextResponse.json(toShipment(updated))
  } catch (error) {
    if (error instanceof EurosenderError || error instanceof SendcloudError) {
      return NextResponse.json({ error: `Carrier sync failed: ${error.message}` }, { status: 502 })
    }
    console.error("POST /api/shipments/[id]/advance failed", error)
    return NextResponse.json({ error: "Failed to advance shipment" }, { status: 500 })
  }
}
