import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, walletTransactions } from "@/db/schema"
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
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.userId, user.id)))
      .limit(1)

    if (!rows[0]) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json(toDeal(rows[0]))
  } catch (error) {
    console.error("GET /api/deals/[id] failed", error)
    return NextResponse.json({ error: "Failed to fetch deal" }, { status: 500 })
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
    const raw = (await req.json()) as Record<string, unknown>
    const payload = normalizePayload(raw)
    const validationError = validateDealPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const updated = await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({ status: deals.status })
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.userId, user.id)))
        .limit(1)
      const existing = existingRows[0]
      if (!existing) return null

      const rows = await tx
        .update(deals)
        .set({
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
          updatedAt: new Date(),
        })
        .where(and(eq(deals.id, id), eq(deals.userId, user.id)))
        .returning()

      const deal = rows[0]

      // Seller's sale just completed — release the held amount into their wallet.
      if (deal && existing.status !== "completed" && deal.status === "completed" && deal.role === "seller") {
        await tx.insert(walletTransactions).values({
          userId: user.id,
          type: "payout",
          amount: (Number(deal.price) + Number(deal.shippingPrice)).toFixed(2),
          status: "completed",
          relatedDealId: deal.id,
          description: `Payout for completed deal — ${deal.title}`,
        })
      }

      return deal ?? null
    })

    if (!updated) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json(toDeal(updated))
  } catch (error) {
    console.error("PUT /api/deals/[id] failed", error)
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 })
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
      .delete(deals)
      .where(and(eq(deals.id, id), eq(deals.userId, user.id)))
      .returning({ id: deals.id })

    if (!rows[0]) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/deals/[id] failed", error)
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 })
  }
}
