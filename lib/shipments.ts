import type { shipments } from "@/db/schema"

export type ShipmentStatus = "arrived" | "in-transit" | "pending"

export interface ShipmentPayload {
  senderName: string
  senderLocation: string
  receiverName: string
  receiverLocation: string
  service: string
  dimensions: string
  weight: string
  status: ShipmentStatus
  dealId?: string | null
}

export interface Shipment extends ShipmentPayload {
  id: string
  createdAt: string
}

export const defaultShipmentPayload: ShipmentPayload = {
  senderName: "",
  senderLocation: "",
  receiverName: "",
  receiverLocation: "",
  service: "Standard",
  dimensions: "0x0x0 cm",
  weight: "0 kg",
  status: "pending",
}

export function validateShipmentPayload(payload: Partial<ShipmentPayload>): string | null {
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

  if (payload.dealId !== undefined && payload.dealId !== null && typeof payload.dealId !== "string") {
    return "Invalid dealId"
  }

  return null
}

type ShipmentRow = typeof shipments.$inferSelect

export function toShipment(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    senderName: row.senderName,
    senderLocation: row.senderLocation,
    receiverName: row.receiverName,
    receiverLocation: row.receiverLocation,
    service: row.service,
    dimensions: row.dimensions,
    weight: row.weight,
    status: row.status as ShipmentStatus,
    dealId: row.dealId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}
