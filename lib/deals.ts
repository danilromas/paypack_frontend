import type { Deal, DealStatus } from "@/types"

export const DEAL_STATUS_VALUES: DealStatus[] = [
  "pending",
  "escrow",
  "shipped",
  "completed",
  "disputed",
  "cancelled",
]

export interface DealCreatePayload {
  title: string
  description: string
  imageUrl?: string | null
  price: number
  shippingPrice: number
  currency: string
  role: "buyer" | "seller"
  counterparty: string
  counterpartyAvatar?: string | null
  counterpartyEmail: string
  sourceUrl?: string | null
  sourcePlatform?: string | null
  paymentMethod?: string | null
  paymentCryptoCoin?: string | null
}

export interface DealEditPayload {
  title: string
  description: string
  imageUrl?: string | null
  price: number
  shippingPrice: number
  currency: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateCommonFields(payload: Partial<DealEditPayload>): string | null {
  if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) return "Invalid title"
  if (payload.description !== undefined && typeof payload.description !== "string") return "Invalid description"
  if (payload.imageUrl !== undefined && payload.imageUrl !== null && typeof payload.imageUrl !== "string") return "Invalid imageUrl"
  if (typeof payload.price !== "number" || Number.isNaN(payload.price) || payload.price < 0) return "Invalid price"
  if (typeof payload.shippingPrice !== "number" || Number.isNaN(payload.shippingPrice) || payload.shippingPrice < 0) return "Invalid shippingPrice"
  if (!payload.currency || typeof payload.currency !== "string") return "Invalid currency"
  return null
}

export function validateDealCreatePayload(payload: Partial<DealCreatePayload>): string | null {
  const commonError = validateCommonFields(payload)
  if (commonError) return commonError
  if (payload.role !== "buyer" && payload.role !== "seller") return "Invalid role"
  if (payload.counterparty === undefined || typeof payload.counterparty !== "string") return "Invalid counterparty"
  if (!payload.counterpartyEmail || !EMAIL_RE.test(payload.counterpartyEmail)) {
    return "A valid counterparty email is required"
  }
  return null
}

export function validateDealEditPayload(payload: Partial<DealEditPayload>): string | null {
  return validateCommonFields(payload)
}

/** Row shape produced by the raw-SQL viewer-aware queries in lib/deals-access.ts. */
export interface DealRowForViewer {
  id: string
  title: string
  description: string
  imageUrl: string | null
  price: string | number
  shippingPrice: string | number
  currency: string
  status: string
  role: string
  counterparty: string
  counterpartyAvatar: string | null
  sourceUrl: string | null
  sourcePlatform: string | null
  paymentMethod: string | null
  paymentCryptoCoin: string | null
  createdAt: string | Date
  updatedAt: string | Date
  myRole: string
  counterpartyName: string | null
  counterpartyJoined: boolean
}

export function toDeal(row: DealRowForViewer): Deal {
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
    myRole: row.myRole as "buyer" | "seller",
    counterparty: row.counterparty,
    counterpartyAvatar: row.counterpartyAvatar ?? undefined,
    counterpartyName: row.counterpartyName,
    counterpartyJoined: row.counterpartyJoined,
    sourceUrl: row.sourceUrl ?? undefined,
    sourcePlatform: row.sourcePlatform ?? undefined,
    paymentMethod: row.paymentMethod ?? undefined,
    paymentCryptoCoin: row.paymentCryptoCoin ?? undefined,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}
