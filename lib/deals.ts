import type { Deal, DealStatus } from "@/types"
import type { deals } from "@/db/schema"

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
  sourceUrl?: string | null
  sourcePlatform?: string | null
  paymentMethod?: string | null
  paymentCryptoCoin?: string | null
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
  if (typeof payload.price !== "number" || Number.isNaN(payload.price) || payload.price < 0) return "Invalid price"
  if (typeof payload.shippingPrice !== "number" || Number.isNaN(payload.shippingPrice) || payload.shippingPrice < 0) return "Invalid shippingPrice"
  if (!payload.currency || typeof payload.currency !== "string") return "Invalid currency"
  if (!payload.status || !DEAL_STATUS_VALUES.includes(payload.status as DealStatus)) return "Invalid status"
  if (payload.role !== "buyer" && payload.role !== "seller") return "Invalid role"
  if (payload.counterparty === undefined || typeof payload.counterparty !== "string") return "Invalid counterparty"

  return null
}

type DealRow = typeof deals.$inferSelect

export function toDeal(row: DealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl ?? undefined,
    price: Number(row.price),
    shippingPrice: Number(row.shippingPrice),
    currency: row.currency,
    status: row.status as DealStatus,
    role: row.role as "buyer" | "seller",
    counterparty: row.counterparty,
    counterpartyAvatar: row.counterpartyAvatar ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    sourcePlatform: row.sourcePlatform ?? undefined,
    paymentMethod: row.paymentMethod ?? undefined,
    paymentCryptoCoin: row.paymentCryptoCoin ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
