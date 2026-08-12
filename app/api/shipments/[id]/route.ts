import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { toShipment, validateShipmentPayload, type ShipmentPayload } from "@/lib/shipments"
import { getCurrentUser } from "@/lib/auth/session"
import { notifyUser } from "@/lib/notifications"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const rows = await db
      .select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.userId, user.id)))
      .limit(1)

    if (!rows[0]) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    return NextResponse.json(toShipment(rows[0]))
  } catch (error) {
    console.error("GET /api/shipments/[id] failed", error)
    return NextResponse.json({ error: "Failed to fetch shipment" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const body = (await req.json()) as Partial<ShipmentPayload>
    const validationError = validateShipmentPayload(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const updated = await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({ status: shipments.status })
        .from(shipments)
        .where(and(eq(shipments.id, id), eq(shipments.userId, user.id)))
        .limit(1)
      const existing = existingRows[0]
      if (!existing) return null

      const rows = await tx
        .update(shipments)
        .set({
          senderName: body.senderName!,
          senderLocation: body.senderLocation!,
          receiverName: body.receiverName!,
          receiverLocation: body.receiverLocation!,
          service: body.service!,
          dimensions: body.dimensions!,
          weight: body.weight!,
          status: body.status!,
          dealId: body.dealId ?? null,
        })
        .where(and(eq(shipments.id, id), eq(shipments.userId, user.id)))
        .returning()

      const shipment = rows[0]
      if (shipment && existing.status !== shipment.status) {
        await notifyUser(tx, {
          userId: user.id,
          type: "shipment",
          title: `Shipment status updated to ${shipment.status}`,
          description: `${shipment.senderLocation} → ${shipment.receiverLocation}`,
          relatedHref: "/dashboard/shipments/",
        })
      }

      return shipment ?? null
    })

    if (!updated) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    return NextResponse.json(toShipment(updated))
  } catch (error) {
    console.error("PUT /api/shipments/[id] failed", error)
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const rows = await db
      .delete(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.userId, user.id)))
      .returning({ id: shipments.id })

    if (!rows[0]) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/shipments/[id] failed", error)
    return NextResponse.json({ error: "Failed to delete shipment" }, { status: 500 })
  }
}
