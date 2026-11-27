import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { and, eq, ne, notExists, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealParticipants, deals } from "@/db/schema"
import { validateDealEditPayload, type DealEditPayload } from "@/lib/deals"
import { getCurrentUser } from "@/lib/auth/session"
import { getDealForViewer } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"

function normalizePayload(body: Record<string, unknown>): DealEditPayload {
  return {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
    price: typeof body.price === "number" ? body.price : Number(body.price),
    shippingPrice:
      typeof body.shippingPrice === "number"
        ? body.shippingPrice
        : Number(body.shippingPrice),
    currency: typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "EUR",
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
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const deal = await getDealForViewer(id, user.id)
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }
    return NextResponse.json(deal)
  } catch (error) {
    console.error("GET /api/deals/[id] failed", error)
    return NextResponse.json({ error: "Failed to fetch deal" }, { status: 500 })
  }
}

/**
 * Edits deal *details* only — title/description/price/images. Cannot touch `status`: every state
 * transition goes through its own role-gated action endpoint (accept/ship/confirm-receipt/cancel/dispute)
 * instead, so "who's allowed to do this" lives in exactly one place per action. Only the creator can edit,
 * and only before the counterparty has accepted (paying into escrow locks the terms).
 */
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
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const raw = (await req.json()) as Record<string, unknown>
    const payload = normalizePayload(raw)
    const validationError = validateDealEditPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const rows = await db
      .update(deals)
      .set({
        title: payload.title.trim(),
        description: payload.description,
        imageUrl: payload.imageUrl ?? null,
        price: (Math.round(payload.price * 100) / 100).toFixed(2),
        shippingPrice: (Math.round(payload.shippingPrice * 100) / 100).toFixed(2),
        currency: payload.currency,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(deals.id, id),
          eq(deals.userId, user.id),
          eq(deals.status, "pending"),
          // Terms are locked once the other side has joined: they agreed to what they saw.
          notExists(
            db
              .select({ one: sql`1` })
              .from(dealParticipants)
              .where(and(eq(dealParticipants.dealId, deals.id), ne(dealParticipants.userId, user.id))),
          ),
        ),
      )
      .returning({ id: deals.id })

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Deal not found, not yours, or no longer editable (the other side already joined)" },
        { status: 404 },
      )
    }

    const updated = await getDealForViewer(id, user.id)
    return NextResponse.json(updated)
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
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const rows = await db.transaction(async (tx) => {
      const deleted = await tx
        .select({ title: deals.title })
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.userId, user.id), eq(deals.status, "pending")))
        .limit(1)
        .for("update")
      if (!deleted[0]) return []
      // Participants cascade away with the deal, so tell the other side first.
      await notifyOtherParticipants(tx, id, user.id, {
        type: "deal",
        title: `"${deleted[0].title}" was deleted by its creator`,
        relatedHref: "/dashboard/deals",
      })
      return tx.delete(deals).where(eq(deals.id, id)).returning({ id: deals.id })
    })

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Deal not found, not yours, or no longer deletable" },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/deals/[id] failed", error)
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 })
  }
}
