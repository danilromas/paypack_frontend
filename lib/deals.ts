import type { Deal, DealStatus } from "@/types"

export interface DealPayload {
  title: string
  description: string
  imageUrl?: string | null
  price: number
  shippingPrice: number
  currency: string
  status: DealStatus
  role: "buyer" | "seller"
  counterparty: string
  counterpartyAvatar?: string | null
}

export const DEAL_STATUS_VALUES: DealStatus[] = [
  "pending",
  "escrow",
  "shipped",
  "in-transit",
  "delivered",
  "completed",
  "disputed",
  "cancelled",
]

export function validateDealPayload(payload: Partial<DealPayload>): string | null {
  if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) return "Invalid title"
  if (payload.description !== undefined && typeof payload.description !== "string") return "Invalid description"
  if (payload.imageUrl !== undefined && payload.imageUrl !== null && typeof payload.imageUrl !== "string") return "Invalid imageUrl"
  if (typeof payload.price !== "number" || Number.isNaN(payload.price)) return "Invalid price"
  if (typeof payload.shippingPrice !== "number" || Number.isNaN(payload.shippingPrice)) return "Invalid shippingPrice"
  if (!payload.currency || typeof payload.currency !== "string") return "Invalid currency"
  if (!payload.status || !DEAL_STATUS_VALUES.includes(payload.status as DealStatus)) return "Invalid status"
  if (payload.role !== "buyer" && payload.role !== "seller") return "Invalid role"
  if (payload.counterparty === undefined || typeof payload.counterparty !== "string") return "Invalid counterparty"

  return null
}

export function toDealFromRow(row: {
  id: string
  title: string
  description: string
  image_url?: string | null
  price: number | string
  shipping_price: number | string
  currency: string
  status: DealStatus
  role: "buyer" | "seller"
  counterparty: string
  counterparty_avatar: string | null
  created_at: string
  updated_at: string
}): Deal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    price: Number(row.price),
    shippingPrice: Number(row.shipping_price),
    currency: row.currency,
    status: row.status,
    role: row.role,
    counterparty: row.counterparty,
    counterpartyAvatar: row.counterparty_avatar ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
