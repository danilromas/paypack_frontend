import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { validateShipmentAddress, normalizeShipmentAddress, type ShipmentAddress } from "@/lib/shipments"
import { SERVICE_TIERS, estimateShippingCost, validatePackageDimensions } from "@/lib/shipping-rates"
import { EurosenderError, getQuotes, isEurosenderEnabled } from "@/lib/eurosender"

interface QuoteBody {
  senderName?: string
  receiverName?: string
  senderAddress?: ShipmentAddress
  receiverAddress?: ShipmentAddress
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  declaredValueEur?: number
}

/**
 * Prices for the wizard's "Compare" step. Live Eurosender rates when configured, otherwise our internal
 * estimate — the response says which via `live`.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as QuoteBody
  const pkg = {
    weightKg: body.weightKg as number,
    lengthCm: body.lengthCm as number,
    widthCm: body.widthCm as number,
    heightCm: body.heightCm as number,
  }
  const pkgError = validatePackageDimensions(pkg)
  if (pkgError) return NextResponse.json({ error: pkgError }, { status: 400 })

  if (!isEurosenderEnabled()) {
    return NextResponse.json({
      live: false,
      quotes: SERVICE_TIERS.map((tier) => ({
        tier: tier.id,
        priceGross: estimateShippingCost(pkg, tier),
        currency: "EUR",
        estimatedDelivery: tier.eta,
        minPickupDate: null,
        pickupExcludedDates: [],
      })),
    })
  }

  const addressError =
    validateShipmentAddress(body.senderAddress, "sender") ?? validateShipmentAddress(body.receiverAddress, "receiver")
  if (addressError) return NextResponse.json({ error: addressError }, { status: 400 })

  try {
    const quotes = await getQuotes({
      sender: { ...normalizeShipmentAddress(body.senderAddress!), name: body.senderName?.trim() || "Sender" },
      receiver: { ...normalizeShipmentAddress(body.receiverAddress!), name: body.receiverName?.trim() || "Receiver" },
      pkg: { ...pkg, valueEur: typeof body.declaredValueEur === "number" ? body.declaredValueEur : undefined },
    })
    return NextResponse.json({ live: true, quotes })
  } catch (error) {
    if (error instanceof EurosenderError) {
      return NextResponse.json({ error: error.message }, { status: error.status >= 500 ? 502 : 400 })
    }
    console.error("POST /api/shipments/quote failed", error)
    return NextResponse.json({ error: "Failed to get shipping quotes" }, { status: 500 })
  }
}
