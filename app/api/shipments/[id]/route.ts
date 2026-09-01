import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { toShipment, validateShipmentEditPayload, type ShipmentEditPayload } from "@/lib/shipments"
import { getCurrentUser } from "@/lib/auth/session"
import { estimateShippingCost, getServiceTier } from "@/lib/shipping-rates"

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

/** Edits package/route details only, and only before the shipment has started moving. */
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
    const body = (await req.json()) as Partial<ShipmentEditPayload>
    const validationError = validateShipmentEditPayload(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const tier = getServiceTier(body.serviceTier!)!
    const estimatedCost = estimateShippingCost(
      {
        weightKg: body.weightKg!,
        lengthCm: body.lengthCm!,
        widthCm: body.widthCm!,
        heightCm: body.heightCm!,
      },
      tier,
    )

    const rows = await db
      .update(shipments)
      .set({
        senderName: body.senderName!,
        senderLocation: body.senderLocation!,
        receiverName: body.receiverName!,
        receiverLocation: body.receiverLocation!,
        serviceTier: body.serviceTier!,
        weightKg: body.weightKg!.toFixed(2),
        lengthCm: body.lengthCm!.toFixed(1),
        widthCm: body.widthCm!.toFixed(1),
        heightCm: body.heightCm!.toFixed(1),
        estimatedCost: estimatedCost.toFixed(2),
      })
      .where(and(eq(shipments.id, id), eq(shipments.userId, user.id), eq(shipments.status, "pending")))
      .returning()

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Shipment not found, not yours, or no longer editable" },
        { status: 404 },
      )
    }

    return NextResponse.json(toShipment(rows[0]))
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
