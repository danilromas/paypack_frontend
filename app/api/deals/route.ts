import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deals } from "@/db/schema"
import { validateDealCreatePayload, type DealCreatePayload } from "@/lib/deals"
import { getCurrentUser } from "@/lib/auth/session"
import { ensureParticipantsAndThread, getDealForViewer, listDealsForViewer } from "@/lib/deals-access"

function normalizePayload(body: Record<string, unknown>): DealCreatePayload {
  return {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
    price: typeof body.price === "number" ? body.price : Number(body.price),
    shippingPrice:
      typeof body.shippingPrice === "number"
        ? body.shippingPrice
        : Number(body.shippingPrice),
    currency: typeof body.currency === "string" ? body.currency : "EUR",
    role: body.role as DealCreatePayload["role"],
    counterparty: typeof body.counterparty === "string" ? body.counterparty : "",
    counterpartyAvatar:
      typeof body.counterpartyAvatar === "string" ? body.counterpartyAvatar : null,
    counterpartyEmail:
      typeof body.counterpartyEmail === "string" ? body.counterpartyEmail.trim().toLowerCase() : "",
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : null,
    sourcePlatform:
      typeof body.sourcePlatform === "string" ? body.sourcePlatform : null,
    paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : null,
    paymentCryptoCoin:
      typeof body.paymentCryptoCoin === "string" ? body.paymentCryptoCoin : null,
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const rows = await listDealsForViewer(user.id)
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET /api/deals failed", error)
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const raw = (await req.json()) as Record<string, unknown>
    const payload = normalizePayload(raw)
    const validationError = validateDealCreatePayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    if (payload.counterpartyEmail === user.email) {
      return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 })
    }

    const dealId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(deals)
        .values({
          userId: user.id,
          title: payload.title.trim(),
          description: payload.description,
          imageUrl: payload.imageUrl ?? null,
          price: (Math.round(payload.price * 100) / 100).toFixed(2),
          shippingPrice: (Math.round(payload.shippingPrice * 100) / 100).toFixed(2),
          currency: payload.currency,
          // Every deal starts pending, full stop — never trust a client-supplied status on create.
          status: "pending",
          role: payload.role,
          counterparty: payload.counterparty,
          counterpartyAvatar: payload.counterpartyAvatar ?? null,
          sourceUrl: payload.sourceUrl ?? null,
          sourcePlatform: payload.sourcePlatform ?? null,
          paymentMethod: payload.paymentMethod ?? null,
          paymentCryptoCoin: payload.paymentCryptoCoin ?? null,
        })
        .returning({ id: deals.id })

      const deal = inserted[0]
      await ensureParticipantsAndThread(
        tx,
        { id: deal.id, role: payload.role },
        user.id,
        payload.counterpartyEmail,
      )
      return deal.id
    })

    const created = await getDealForViewer(dealId, user.id)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("POST /api/deals failed", error)
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 })
  }
}
