import type { Deal, DealStatus } from "@/types"
import { containsCyrillic, LATIN_ONLY_MESSAGE } from "@/lib/text-validation"

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
  sourceUrl?: string | null
  sourcePlatform?: string | null
  paymentMethod?: string | null
  paymentCryptoCoin?: string | null
  boxLengthCm?: number | null
  boxWidthCm?: number | null
  boxHeightCm?: number | null
}

export interface DealEditPayload {
  title: string
  description: string
  imageUrl?: string | null
  price: number
  shippingPrice: number
  currency: string
}

export const DEAL_CURRENCIES = ["EUR", "USD", "GBP"] as const
/** Comfortably below numeric(12,2)'s 10^10 ceiling, so a typo can't overflow the column. */
export const MAX_DEAL_AMOUNT = 1_000_000

function isAmount(value: unknown, { allowZero }: { allowZero: boolean }): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (allowZero ? value >= 0 : value > 0) &&
    value <= MAX_DEAL_AMOUNT
  )
}

/** Only http(s) links may be stored for images/sources — never javascript: or data: URLs. */
export function isSafeHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function validateCommonFields(payload: Partial<DealEditPayload>): string | null {
  if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) return "Invalid title"
  if (payload.title.length > 200) return "Title is too long (200 characters max)"
  if (payload.description !== undefined && typeof payload.description !== "string") return "Invalid description"
  if (typeof payload.description === "string" && payload.description.length > 5000) return "Description is too long"
  if (payload.imageUrl !== undefined && payload.imageUrl !== null && !isSafeHttpUrl(payload.imageUrl)) return "Invalid imageUrl"
  if (!isAmount(payload.price, { allowZero: false })) return "Invalid price"
  if (!isAmount(payload.shippingPrice, { allowZero: true })) return "Invalid shippingPrice"
  if (!payload.currency || !(DEAL_CURRENCIES as readonly string[]).includes(payload.currency)) return "Unsupported currency"
  if (containsCyrillic(payload.title) || containsCyrillic(payload.description)) return LATIN_ONLY_MESSAGE
  return null
}

export function validateDealCreatePayload(payload: Partial<DealCreatePayload>): string | null {
  const commonError = validateCommonFields(payload)
  if (commonError) return commonError
  if (payload.role !== "buyer" && payload.role !== "seller") return "Invalid role"
  if (payload.counterparty === undefined || typeof payload.counterparty !== "string") return "Invalid counterparty"
  if (payload.counterparty.length > 200) return "Invalid counterparty"
  if (payload.sourceUrl != null && !isSafeHttpUrl(payload.sourceUrl)) return "Invalid sourceUrl"
  if (payload.counterpartyAvatar != null && !isSafeHttpUrl(payload.counterpartyAvatar)) return "Invalid counterpartyAvatar"
  for (const dim of [payload.boxLengthCm, payload.boxWidthCm, payload.boxHeightCm]) {
    if (dim != null && !(typeof dim === "number" && Number.isFinite(dim) && dim > 0 && dim <= 500)) return "Invalid box size"
  }
  if (containsCyrillic(payload.counterparty)) return LATIN_ONLY_MESSAGE
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
  carrier: string | null
  trackingNumber: string | null
  boxLengthCm: string | number | null
  boxWidthCm: string | number | null
  boxHeightCm: string | number | null
  counterpartyUserId: string | null
  hasRated: boolean
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
    carrier: row.carrier ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    boxLengthCm: row.boxLengthCm != null ? Number(row.boxLengthCm) : undefined,
    boxWidthCm: row.boxWidthCm != null ? Number(row.boxWidthCm) : undefined,
    boxHeightCm: row.boxHeightCm != null ? Number(row.boxHeightCm) : undefined,
    counterpartyUserId: row.counterpartyUserId ?? undefined,
    hasRated: row.hasRated,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}
