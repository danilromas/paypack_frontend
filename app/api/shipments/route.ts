import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import {
  formatShipmentAddress,
  normalizeShipmentAddress,
  toShipment,
  validateShipmentAddress,
  validateShipmentCreatePayload,
  type ShipmentCreatePayload,
} from "@/lib/shipments"
import { getCurrentUser, restrictionError } from "@/lib/auth/session"
import { estimateShippingCost, generateTrackingNumber, getServiceTier } from "@/lib/shipping-rates"
import { EurosenderError, createOrder, isEurosenderEnabled } from "@/lib/eurosender"

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
  const restricted = restrictionError(user)
  if (restricted) {
    return NextResponse.json(restricted, { status: 403 })
  }

  try {
    const body = (await req.json()) as Partial<ShipmentCreatePayload>
    const validationError = validateShipmentCreatePayload(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const tier = getServiceTier(body.serviceTier!)!
    const pkg = {
      weightKg: body.weightKg!,
      lengthCm: body.lengthCm!,
      widthCm: body.widthCm!,
      heightCm: body.heightCm!,
    }
    const senderAddress = body.senderAddress ? normalizeShipmentAddress(body.senderAddress) : null
    const receiverAddress = body.receiverAddress ? normalizeShipmentAddress(body.receiverAddress) : null

    const base = {
      userId: user.id,
      dealId: body.dealId ?? null,
      senderName: body.senderName!,
      senderLocation: senderAddress ? formatShipmentAddress(senderAddress) : body.senderLocation!,
      receiverName: body.receiverName!,
      receiverLocation: receiverAddress ? formatShipmentAddress(receiverAddress) : body.receiverLocation!,
      serviceTier: body.serviceTier!,
      weightKg: pkg.weightKg.toFixed(2),
      lengthCm: pkg.lengthCm.toFixed(1),
      widthCm: pkg.widthCm.toFixed(1),
      heightCm: pkg.heightCm.toFixed(1),
      senderAddress,
      receiverAddress,
      pickupDate: body.pickupDate ?? null,
      // Every shipment starts pending — status only ever moves forward.
      status: "pending",
    }

    if (isEurosenderEnabled()) {
      const addressError =
        validateShipmentAddress(senderAddress, "sender") ?? validateShipmentAddress(receiverAddress, "receiver")
      if (addressError) return NextResponse.json({ error: addressError }, { status: 400 })
      if (!body.pickupDate) return NextResponse.json({ error: "Pick a pickup date" }, { status: 400 })

      // Book the real order first; only persist once the carrier has accepted it.
      const order = await createOrder(
        {
          sender: { ...senderAddress!, name: body.senderName!.trim() },
          receiver: { ...receiverAddress!, name: body.receiverName!.trim() },
          pkg: { ...pkg, content: body.contents ?? undefined, valueEur: body.declaredValueEur ?? undefined },
        },
        tier.id,
        body.pickupDate,
      )

      const inserted = await db
        .insert(shipments)
        .values({
          ...base,
          provider: "eurosender",
          providerOrderCode: order.orderCode,
          carrierName: order.carrierName,
          labelUrl: order.labelUrl,
          trackingUrl: order.trackingUrl,
          // Carrier tracking numbers often arrive later (via webhook); show the order code until then.
          trackingNumber: order.trackingNumber ?? order.orderCode,
          estimatedCost: (order.priceGross ?? estimateShippingCost(pkg, tier)).toFixed(2),
          estimatedCurrency: order.currency ?? "EUR",
        })
        .returning()

      return NextResponse.json(toShipment(inserted[0]), { status: 201 })
    }

    const inserted = await db
      .insert(shipments)
      .values({
        ...base,
        estimatedCost: estimateShippingCost(pkg, tier).toFixed(2),
        trackingNumber: generateTrackingNumber(),
      })
      .returning()

    return NextResponse.json(toShipment(inserted[0]), { status: 201 })
  } catch (error) {
    if (error instanceof EurosenderError) {
      console.error("Eurosender order creation failed", error.status, error.details)
      return NextResponse.json(
        { error: `Carrier rejected the shipment: ${error.message}` },
        { status: error.status >= 500 ? 502 : 400 },
      )
    }
    console.error("POST /api/shipments failed", error)
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 })
  }
}
