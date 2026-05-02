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

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureShipmentsTable()
    const sql = getSql()
    const { id } = await context.params
    const body = (await req.json()) as Partial<ShipmentPayload>
    const validationError = validatePayload(body)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const rows = await sql<ShipmentRow[]>`
      UPDATE shipments
      SET
        sender_name = ${body.senderName!},
        sender_location = ${body.senderLocation!},
        receiver_name = ${body.receiverName!},
        receiver_location = ${body.receiverLocation!},
        service = ${body.service!},
        dimensions = ${body.dimensions!},
        weight = ${body.weight!},
        status = ${body.status as ShipmentStatus}
      WHERE id = ${id}
      RETURNING *
    `

    if (!rows[0]) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    return NextResponse.json(toShipment(rows[0]))
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update shipment", details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureShipmentsTable()
    const sql = getSql()
    const { id } = await context.params
    const rows = await sql<{ id: string }[]>`
      DELETE FROM shipments
      WHERE id = ${id}
      RETURNING id
    `

    if (!rows[0]) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete shipment", details: String(error) },
      { status: 500 }
    )
  }
}
