import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { toQuoteAddress, validateQuoteAddress, type ShipmentAddress } from "@/lib/shipments"
import { SERVICE_TIERS, estimateShippingCost, validatePackageDimensions } from "@/lib/shipping-rates"
import { EurosenderError, getQuotes as getEurosenderQuotes } from "@/lib/eurosender"
import { SendcloudError, getQuotes as getSendcloudQuotes } from "@/lib/sendcloud"
import { isLiveShippingEnabled, liveProviderFor, unsupportedRouteMessage } from "@/lib/shipping-provider"

interface QuoteBody {
  senderName?: string
  receiverName?: string
  senderAddress?: Partial<ShipmentAddress>
  receiverAddress?: Partial<ShipmentAddress>
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  declaredValueEur?: number
}

/**
 * Prices for the wizard's "Compare" step. Live Sendcloud / Eurosender rates when configured (picked by
 * sender country), otherwise our internal estimate — the response says which via `live` and `provider`.
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

  if (!isLiveShippingEnabled()) {
    return NextResponse.json({
      live: false,
      provider: "internal",
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
    validateQuoteAddress(body.senderAddress, "sender") ?? validateQuoteAddress(body.receiverAddress, "receiver")
  if (addressError) return NextResponse.json({ error: addressError }, { status: 400 })

  // Country and postcode are enough to price a route; the full addresses come later in the wizard.
  const sender = toQuoteAddress(body.senderAddress!)
  const receiver = toQuoteAddress(body.receiverAddress!)
  const receiverCountry = receiver.country
  const provider = liveProviderFor(sender.country, receiverCountry)
  if (!provider) return NextResponse.json({ error: unsupportedRouteMessage(receiverCountry) }, { status: 400 })

  try {
    const input = {
      sender: { ...sender, name: body.senderName?.trim() || "Sender" },
      receiver: { ...receiver, name: body.receiverName?.trim() || "Receiver" },
      pkg: { ...pkg, valueEur: typeof body.declaredValueEur === "number" ? body.declaredValueEur : undefined },
    }
    const quotes = provider === "sendcloud" ? await getSendcloudQuotes(input) : await getEurosenderQuotes(input)
    return NextResponse.json({ live: true, provider, quotes })
  } catch (error) {
    if (error instanceof EurosenderError || error instanceof SendcloudError) {
      console.error(`${provider} quote failed`, error.status, error.details)
      return NextResponse.json({ error: error.message }, { status: error.status >= 500 ? 502 : 400 })
    }
    console.error("POST /api/shipments/quote failed", error)
    return NextResponse.json({ error: "Failed to get shipping quotes" }, { status: 500 })
  }
}
