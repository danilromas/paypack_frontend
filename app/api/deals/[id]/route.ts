import { NextResponse } from "next/server"
import { ensureDealsTable, getSql } from "@/lib/neon"
import {
  toDealFromRow,
  validateDealPayload,
  type DealPayload,
} from "@/lib/deals"
import type { DealStatus } from "@/types"

interface DealRow {
  id: string
  title: string
  description: string
  image_url: string | null
  price: number
  shipping_price: number
  currency: string
  status: DealStatus
  role: "buyer" | "seller"
  counterparty: string
  counterparty_avatar: string | null
  created_at: string
  updated_at: string
}

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
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDealsTable()
    const sql = getSql()
    const { id } = await context.params
    const rows = await sql<DealRow[]>`
      SELECT * FROM deals
      WHERE id = ${id}
      LIMIT 1
    `

    if (!rows[0]) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json(toDealFromRow(rows[0]))
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch deal", details: String(error) },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDealsTable()
    const sql = getSql()
    const { id } = await context.params
    const raw = (await req.json()) as Record<string, unknown>
    const payload = normalizePayload(raw)
    const validationError = validateDealPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const rows = await sql<DealRow[]>`
      UPDATE deals
      SET
        title = ${payload.title.trim()},
        description = ${payload.description},
        image_url = ${payload.imageUrl ?? null},
        price = ${Math.round(payload.price)},
        shipping_price = ${Math.round(payload.shippingPrice)},
        currency = ${payload.currency},
        status = ${payload.status},
        role = ${payload.role},
        counterparty = ${payload.counterparty},
        counterparty_avatar = ${payload.counterpartyAvatar ?? null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (!rows[0]) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json(toDealFromRow(rows[0]))
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update deal", details: String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDealsTable()
    const sql = getSql()
    const { id } = await context.params
    const rows = await sql<{ id: string }[]>`
      DELETE FROM deals
      WHERE id = ${id}
      RETURNING id
    `

    if (!rows[0]) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete deal", details: String(error) },
      { status: 500 },
    )
  }
}
