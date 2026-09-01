import type { shipments } from "@/db/schema"
import { validatePackageDimensions, type ServiceTier } from "@/lib/shipping-rates"

export type ShipmentStatus = "arrived" | "in-transit" | "pending"

export interface ShipmentCreatePayload {
  senderName: string
  senderLocation: string
  receiverName: string
  receiverLocation: string
  serviceTier: ServiceTier
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  dealId?: string | null
}

export interface ShipmentEditPayload {
  senderName: string
  senderLocation: string
  receiverName: string
  receiverLocation: string
  serviceTier: ServiceTier
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

export interface Shipment {
  id: string
  senderName: string
  senderLocation: string
  receiverName: string
  receiverLocation: string
  serviceTier: ServiceTier
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  estimatedCost: number
  estimatedCurrency: string
  trackingNumber: string
  status: ShipmentStatus
  dealId?: string | null
  createdAt: string
}

const SERVICE_TIER_VALUES: ServiceTier[] = ["economy", "standard", "express"]

function validateShared(payload: Partial<ShipmentEditPayload>): string | null {
  const requiredText: (keyof ShipmentEditPayload)[] = [
    "senderName",
    "senderLocation",
    "receiverName",
    "receiverLocation",
  ]
  for (const field of requiredText) {
    if (!payload[field] || typeof payload[field] !== "string") {
      return `Invalid field: ${field}`
    }
  }
  if (!payload.serviceTier || !SERVICE_TIER_VALUES.includes(payload.serviceTier)) {
    return "Invalid service tier"
  }
  return validatePackageDimensions({
    weightKg: payload.weightKg as number,
    lengthCm: payload.lengthCm as number,
    widthCm: payload.widthCm as number,
    heightCm: payload.heightCm as number,
  })
}

export function validateShipmentCreatePayload(payload: Partial<ShipmentCreatePayload>): string | null {
  const error = validateShared(payload)
  if (error) return error
  if (payload.dealId !== undefined && payload.dealId !== null && typeof payload.dealId !== "string") {
    return "Invalid dealId"
  }
  return null
}

export function validateShipmentEditPayload(payload: Partial<ShipmentEditPayload>): string | null {
  return validateShared(payload)
}

type ShipmentRow = typeof shipments.$inferSelect

export function toShipment(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    senderName: row.senderName,
    senderLocation: row.senderLocation,
    receiverName: row.receiverName,
    receiverLocation: row.receiverLocation,
    serviceTier: row.serviceTier as ServiceTier,
    weightKg: Number(row.weightKg),
    lengthCm: Number(row.lengthCm),
    widthCm: Number(row.widthCm),
    heightCm: Number(row.heightCm),
    estimatedCost: Number(row.estimatedCost),
    estimatedCurrency: row.estimatedCurrency,
    trackingNumber: row.trackingNumber,
    status: row.status as ShipmentStatus,
    dealId: row.dealId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}
