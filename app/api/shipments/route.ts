import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { toShipment, validateShipmentCreatePayload, type ShipmentCreatePayload } from "@/lib/shipments"
import { getCurrentUser } from "@/lib/auth/session"
import { estimateShippingCost, generateTrackingNumber, getServiceTier } from "@/lib/shipping-rates"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const rows = await db
      .select()
      .from(shipments)
      .where(eq(shipments.userId, user.id))
      .orderBy(desc(shipments.createdAt))

    return NextResponse.json(rows.map(toShipment))
  } catch (error) {
    console.error("GET /api/shipments failed", error)
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Partial<ShipmentCreatePayload>
    const validationError = validateShipmentCreatePayload(body)
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

    const inserted = await db
      .insert(shipments)
      .values({
        userId: user.id,
        dealId: body.dealId ?? null,
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
        trackingNumber: generateTrackingNumber(),
        // Every shipment starts pending — status only ever moves forward via /advance.
        status: "pending",
      })
      .returning()

    return NextResponse.json(toShipment(inserted[0]), { status: 201 })
  } catch (error) {
    console.error("POST /api/shipments failed", error)
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 })
  }
}
