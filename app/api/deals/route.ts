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

export async function GET() {
  try {
    await ensureDealsTable()
    const sql = getSql()
    const rows = await sql<DealRow[]>`
      SELECT * FROM deals
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows.map(toDealFromRow))
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch deals", details: String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    await ensureDealsTable()
    const sql = getSql()
    const raw = (await req.json()) as Record<string, unknown>
    const payload = normalizePayload(raw)
    const validationError = validateDealPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const inserted = await sql<DealRow[]>`
      INSERT INTO deals (
        title, description, price, shipping_price, currency,
        status, role, counterparty, counterparty_avatar
      )
      VALUES (
        ${payload.title.trim()},
        ${payload.description},
        ${Math.round(payload.price)},
        ${Math.round(payload.shippingPrice)},
        ${payload.currency},
        ${payload.status},
        ${payload.role},
        ${payload.counterparty},
        ${payload.counterpartyAvatar ?? null}
      )
      RETURNING *
    `

    return NextResponse.json(toDealFromRow(inserted[0]), { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create deal", details: String(error) },
      { status: 500 },
    )
  }
}
