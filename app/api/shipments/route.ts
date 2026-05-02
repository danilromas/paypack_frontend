import { NextResponse } from "next/server"
import { ensureShipmentsTable, getSql } from "@/lib/neon"
import type { ShipmentPayload, ShipmentStatus } from "@/lib/shipments"

interface ShipmentRow {
  id: string
  sender_name: string
  sender_location: string
  receiver_name: string
  receiver_location: string
  service: string
  dimensions: string
  weight: string
  status: ShipmentStatus
  created_at: string
}

function toShipment(row: ShipmentRow) {
  return {
    id: row.id,
    senderName: row.sender_name,
    senderLocation: row.sender_location,
    receiverName: row.receiver_name,
    receiverLocation: row.receiver_location,
    service: row.service,
    dimensions: row.dimensions,
    weight: row.weight,
    status: row.status,
    createdAt: row.created_at,
  }
}

function validatePayload(payload: Partial<ShipmentPayload>) {
  const requiredFields: Array<keyof ShipmentPayload> = [
    "senderName",
    "senderLocation",
    "receiverName",
    "receiverLocation",
    "service",
    "dimensions",
    "weight",
    "status",
  ]

  for (const field of requiredFields) {
    if (!payload[field] || typeof payload[field] !== "string") {
      return `Invalid field: ${field}`
    }
  }

  if (!["arrived", "in-transit", "pending"].includes(payload.status as string)) {
    return "Invalid status"
  }

  return null
}

export async function GET() {
  try {
    await ensureShipmentsTable()
    const sql = getSql()
    const rows = await sql<ShipmentRow[]>`
      SELECT * FROM shipments
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows.map(toShipment))
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch shipments", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await ensureShipmentsTable()
    const sql = getSql()
    const body = (await req.json()) as Partial<ShipmentPayload>
    const validationError = validatePayload(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const inserted = await sql<ShipmentRow[]>`
      INSERT INTO shipments (
        sender_name, sender_location, receiver_name, receiver_location,
        service, dimensions, weight, status
      )
      VALUES (
        ${body.senderName!}, ${body.senderLocation!}, ${body.receiverName!}, ${body.receiverLocation!},
        ${body.service!}, ${body.dimensions!}, ${body.weight!}, ${body.status as ShipmentStatus}
      )
      RETURNING *
    `

    return NextResponse.json(toShipment(inserted[0]), { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create shipment", details: String(error) },
      { status: 500 }
    )
  }
}
