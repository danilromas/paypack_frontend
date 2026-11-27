import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import {
  formatShipmentAddress,
  needsCustoms,
  normalizeCustomsDetails,
  normalizeShipmentAddress,
  toShipment,
  validateShipmentAddress,
  validateShipmentCreatePayload,
  type ShipmentCreatePayload,
} from "@/lib/shipments"
import { getCurrentUser, restrictionError } from "@/lib/auth/session"
import { isBookingPasswordValid } from "@/lib/shipment-access"
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { applyMarkup, checkShipperCredit } from "@/lib/shipment-billing"
import { refreshActiveShipments } from "@/lib/shipment-refresh"
import { estimateShippingCost, generateTrackingNumber, getServiceTier } from "@/lib/shipping-rates"
import { EurosenderError, cancelOrder, createOrder } from "@/lib/eurosender"
import {
  SendcloudError,
  cancelShipment as cancelSendcloudShipment,
  createShipment as createSendcloudShipment,
  getServicePoint,
} from "@/lib/sendcloud"
import { getParticipantRole } from "@/lib/deals-access"
import { isUuid } from "@/lib/ids"
import { isLiveShippingEnabled, liveProviderFor, unsupportedRouteMessage } from "@/lib/shipping-provider"

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

    return NextResponse.json((await refreshActiveShipments(rows)).map(toShipment))
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
    // Shipper accounts book on their own account (PayPack invoices them); everyone else needs the
    // shared booking password while PayPack pays every label.
    const isShipper = user.canBookShipments
    if (!isShipper) {
      const limit = rateLimit(`booking-password:${user.id}:${clientIp(req)}`, 10, 15 * 60 * 1000)
      if (!limit.ok) return tooManyRequests(limit)
      if (!isBookingPasswordValid(body.bookingPassword)) {
        return NextResponse.json({ error: "Wrong booking password" }, { status: 403 })
      }
    }
    // A real carrier label booked by a shipper account is billed back to them later.
    const billingStatus = isShipper ? ("unbilled" as const) : ("none" as const)
    const validationError = validateShipmentCreatePayload(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    // The legacy deal link is optional, but it must point at a deal the booker takes part in.
    if (body.dealId) {
      if (!isUuid(body.dealId) || !(await getParticipantRole(body.dealId, user.id))) {
        return NextResponse.json({ error: "Invalid dealId" }, { status: 400 })
      }
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

    // Shipper accounts book on credit: refuse up front once unpaid labels would pass their limit.
    let markupPct = 0
    if (isShipper) {
      const quoted = typeof body.quotedPrice === "number" && Number.isFinite(body.quotedPrice) ? body.quotedPrice : 0
      const credit = await checkShipperCredit(user.id, Math.max(quoted, estimateShippingCost(pkg, tier)))
      if (!credit.ok) return NextResponse.json({ error: credit.error }, { status: 402 })
      markupPct = credit.terms.markupPct
    }
    const billedFor = (cost: number) => (isShipper ? applyMarkup(cost, markupPct).toFixed(2) : null)

    if (isLiveShippingEnabled()) {
      const addressError =
        validateShipmentAddress(senderAddress, "sender") ?? validateShipmentAddress(receiverAddress, "receiver")
      if (addressError) return NextResponse.json({ error: addressError }, { status: 400 })
      if (!body.pickupDate) return NextResponse.json({ error: "Pick a pickup date" }, { status: 400 })

      const provider = liveProviderFor(senderAddress!.country, receiverAddress!.country)
      if (!provider) {
        return NextResponse.json({ error: unsupportedRouteMessage(receiverAddress!.country) }, { status: 400 })
      }

      const input = {
        sender: { ...senderAddress!, name: body.senderName!.trim() },
        receiver: { ...receiverAddress!, name: body.receiverName!.trim() },
        pkg: { ...pkg, content: body.contents ?? undefined, valueEur: body.declaredValueEur ?? undefined },
        customs: needsCustoms(receiverAddress!.country) && body.customs ? normalizeCustomsDetails(body.customs) : null,
      }

      const delivery = body.delivery ?? "home"
      if (delivery === "point" && provider !== "sendcloud") {
        return NextResponse.json({ error: "Pickup point delivery isn't available on this route" }, { status: 400 })
      }

      if (provider === "sendcloud") {
        // Look the point up ourselves: it fixes which carrier must carry the parcel, and what we show later.
        const servicePoint = delivery === "point" ? await getServicePoint(body.servicePointId!) : null
        // Our row id doubles as Sendcloud's external reference, so a retried request can't double-book.
        const id = randomUUID()
        const booked = await createSendcloudShipment(
          { ...input, servicePointId: servicePoint?.id ?? null },
          tier.id,
          id,
          delivery,
          servicePoint?.carrierCode ?? null,
        )
        const inserted = await persistOrCancel(
          () => cancelSendcloudShipment(booked.shipmentId),
          () => db
          .insert(shipments)
          .values({
            ...base,
            receiverAddress: servicePoint ? { ...receiverAddress!, servicePoint } : receiverAddress,
            id,
            provider: "sendcloud",
            billingStatus,
            providerOrderCode: booked.shipmentId,
            carrierName: booked.carrierName,
            labelUrl: booked.labelUrl,
            trackingUrl: booked.trackingUrl,
            trackingNumber: booked.trackingNumber ?? booked.shipmentId,
            // Sendcloud doesn't echo the price on the shipment; store the server-side quote we booked against.
            estimatedCost: (booked.priceGross ?? estimateShippingCost(pkg, tier)).toFixed(2),
            billedAmount: billedFor(booked.priceGross ?? estimateShippingCost(pkg, tier)),
            estimatedCurrency: booked.currency ?? "EUR",
          })
          .returning(),
        )
        return NextResponse.json(toShipment(inserted[0]), { status: 201 })
      }

      // Book the real order first; only persist once the carrier has accepted it.
      const order = await createOrder(input, tier.id, body.pickupDate)

      const inserted = await persistOrCancel(
        () => cancelOrder(order.orderCode),
        () => db
        .insert(shipments)
        .values({
          ...base,
          provider: "eurosender",
          billingStatus,
          providerOrderCode: order.orderCode,
          carrierName: order.carrierName,
          labelUrl: order.labelUrl,
          trackingUrl: order.trackingUrl,
          // Carrier tracking numbers often arrive later (via webhook); show the order code until then.
          trackingNumber: order.trackingNumber ?? order.orderCode,
          estimatedCost: (order.priceGross ?? estimateShippingCost(pkg, tier)).toFixed(2),
          billedAmount: billedFor(order.priceGross ?? estimateShippingCost(pkg, tier)),
          estimatedCurrency: order.currency ?? "EUR",
        })
        .returning(),
      )

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
    if (error instanceof EurosenderError || error instanceof SendcloudError) {
      console.error("Carrier booking failed", error.status, JSON.stringify(error.details))
      return NextResponse.json(
        { error: `Carrier rejected the shipment: ${error.message}` },
        { status: error.status >= 500 ? 502 : 400 },
      )
    }
    console.error("POST /api/shipments failed", error)
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 })
  }
}

/**
 * The carrier has already accepted (and charged for) the booking when we store it. If storing fails,
 * cancel the booking so PayPack isn't billed for a label nobody can see; a retry then books afresh.
 */
async function persistOrCancel<T>(cancel: () => Promise<unknown>, persist: () => Promise<T>): Promise<T> {
  try {
    return await persist()
  } catch (error) {
    await cancel().catch((cancelError) => {
      console.error("Booked carrier order could not be stored NOR cancelled — cancel it by hand", cancelError)
    })
    throw error
  }
}
