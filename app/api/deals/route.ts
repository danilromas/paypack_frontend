import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals } from "@/db/schema"
import { toDeal, validateDealPayload, type DealPayload } from "@/lib/deals"
import { getCurrentUser } from "@/lib/auth/session"
import type { DealStatus } from "@/types"

function normalizePayload(body: Record<string, unknown>): DealPayload {
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
    status: body.status as DealStatus,
    role: body.role as DealPayload["role"],
    counterparty: typeof body.counterparty === "string" ? body.counterparty : "",
    counterpartyAvatar:
      typeof body.counterpartyAvatar === "string" ? body.counterpartyAvatar : null,
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
    const rows = await db
      .select()
      .from(deals)
      .where(eq(deals.userId, user.id))
      .orderBy(desc(deals.createdAt))

    return NextResponse.json(rows.map(toDeal))
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
    const validationError = validateDealPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const inserted = await db
      .insert(deals)
      .values({
        userId: user.id,
        title: payload.title.trim(),
        description: payload.description,
        imageUrl: payload.imageUrl ?? null,
        price: (Math.round(payload.price * 100) / 100).toFixed(2),
        shippingPrice: (Math.round(payload.shippingPrice * 100) / 100).toFixed(2),
        currency: payload.currency,
        status: payload.status,
        role: payload.role,
        counterparty: payload.counterparty,
        counterpartyAvatar: payload.counterpartyAvatar ?? null,
        sourceUrl: payload.sourceUrl ?? null,
        sourcePlatform: payload.sourcePlatform ?? null,
        paymentMethod: payload.paymentMethod ?? null,
        paymentCryptoCoin: payload.paymentCryptoCoin ?? null,
      })
      .returning()

    return NextResponse.json(toDeal(inserted[0]), { status: 201 })
  } catch (error) {
    console.error("POST /api/deals failed", error)
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 })
  }
}
