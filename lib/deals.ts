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

/**
 * Buyer protection window: once a deal has shipped, the buyer has this many days to confirm receipt
 * or open a dispute. After that the seller may release the escrow to themselves, so a deal can never
 * get stuck because the buyer went silent.
 */
export const BUYER_PROTECTION_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/** When the seller may release the funds on a shipped deal (null if it hasn't shipped). */
export function releaseAvailableAt(shippedAt: string | Date | null | undefined): Date | null {
  if (!shippedAt) return null
  return new Date(new Date(shippedAt).getTime() + BUYER_PROTECTION_DAYS * DAY_MS)
}

export type DealEventType =
  | "created"
  | "edited"
  | "joined"
  | "paid"
  | "address_updated"
  | "shipped"
  | "delivered"
  | "completed"
  | "auto_released"
  | "cancelled"
  | "disputed"
  | "dispute_resolved"
  | "rated"

export interface DealEventDTO {
  id: string
  type: DealEventType
  message: string
  actorUserId: string | null
  actorName: string | null
  createdAt: string
}

export interface DeliveryAddress {
  name: string
  phone: string
  street: string
  city: string
  postcode: string
  /** Two-letter ISO country code. */
  country: string
  note: string
}

/** Reads and trims a delivery address from an untrusted request body. */
export function parseDeliveryAddress(raw: unknown): DeliveryAddress | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
  return {
    name: str(r.name),
    phone: str(r.phone),
    street: str(r.street),
    city: str(r.city),
    postcode: str(r.postcode),
    country: str(r.country).toUpperCase(),
    note: str(r.note),
  }
}

export function validateDeliveryAddress(a: DeliveryAddress | null): string | null {
  if (!a) return "Add the address the seller should ship to"
  if (!a.name) return "Enter the recipient's name"
  if (!a.street) return "Enter the street and house number"
  if (!a.city) return "Enter the city"
  if (!a.postcode) return "Enter the postcode"
  if (!/^[A-Z]{2}$/.test(a.country)) return "Choose the country"
  if (a.phone && !/^[+()\d\s.-]{5,25}$/.test(a.phone)) return "Enter a valid phone number"
  const fields = [a.name, a.phone, a.street, a.city, a.postcode, a.note]
  if (fields.some((f) => f.length > 200)) return "One of the address fields is too long"
  // Carriers print labels in Latin script only.
  if (fields.some((f) => containsCyrillic(f))) return LATIN_ONLY_MESSAGE
  return null
}

/** Carriers sellers pick from when marking a deal as shipped; most have a public tracking page. */
export const DEAL_CARRIERS: { value: string; label: string; trackingUrl?: (n: string) => string }[] = [
  { value: "DHL", label: "DHL", trackingUrl: (n) => `https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=${n}` },
  { value: "UPS", label: "UPS", trackingUrl: (n) => `https://www.ups.com/track?tracknum=${n}` },
  { value: "FedEx", label: "FedEx", trackingUrl: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { value: "GLS", label: "GLS", trackingUrl: (n) => `https://gls-group.com/track/${n}` },
  { value: "DPD", label: "DPD", trackingUrl: (n) => `https://tracking.dpd.de/status/en_US/parcel/${n}` },
  { value: "Poste Italiane", label: "Poste Italiane", trackingUrl: (n) => `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${n}` },
  { value: "BRT", label: "BRT", trackingUrl: (n) => `https://vas.brt.it/vas/sped_det_show.hsm?referer=sped_numspe_par.htm&Nspediz=${n}` },
  { value: "Correos", label: "Correos", trackingUrl: (n) => `https://www.correos.es/es/en/tools/tracker/items/details?tracking-number=${n}` },
  { value: "La Poste", label: "La Poste / Colissimo", trackingUrl: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${n}` },
  { value: "PostNL", label: "PostNL", trackingUrl: (n) => `https://jouw.postnl.nl/track-and-trace/${n}` },
  { value: "Royal Mail", label: "Royal Mail", trackingUrl: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
  { value: "InPost", label: "InPost", trackingUrl: (n) => `https://inpost.pl/sledzenie-przesylek?number=${n}` },
  { value: "Other", label: "Other / hand delivery" },
]

/**
 * Whose move it is on a deal and what that move is — drives "Your turn" on the dashboard and the
 * hint on each deal card. `mine` is false when the viewer is waiting on the other side.
 */
export function nextStepFor(
  deal: Pick<Deal, "status" | "myRole" | "counterpartyJoined" | "shippedAt" | "deliveredAt" | "hasRated">,
  now: Date = new Date(),
): { mine: boolean; label: string } | null {
  const buyer = deal.myRole === "buyer"
  switch (deal.status) {
    case "pending":
      if (!deal.counterpartyJoined) return { mine: false, label: "Waiting for the other side to join" }
      return buyer ? { mine: true, label: "Pay into escrow" } : { mine: false, label: "Waiting for payment" }
    case "escrow":
      return buyer ? { mine: false, label: "Waiting for the seller to ship" } : { mine: true, label: "Ship the item" }
    case "shipped": {
      if (buyer) return { mine: true, label: deal.deliveredAt ? "Confirm receipt" : "Confirm when it arrives" }
      const releaseAt = releaseAvailableAt(deal.shippedAt)
      if (releaseAt && releaseAt.getTime() <= now.getTime()) return { mine: true, label: "Release the payment" }
      return { mine: false, label: "Waiting for the buyer to confirm" }
    }
    case "disputed":
      return { mine: false, label: "Dispute under review" }
    case "completed":
      return deal.hasRated ? null : { mine: true, label: "Rate the other side" }
    default:
      return null
  }
}

/** Public tracking link for a carrier + number, when we know the carrier's tracking page. */
export function trackingUrlFor(carrier: string | null | undefined, trackingNumber: string | null | undefined): string | null {
  if (!carrier || !trackingNumber) return null
  const entry = DEAL_CARRIERS.find((c) => c.value.toLowerCase() === carrier.trim().toLowerCase())
  return entry?.trackingUrl ? entry.trackingUrl(encodeURIComponent(trackingNumber.trim())) : null
}
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
  deliveryName: string | null
  deliveryPhone: string | null
  deliveryStreet: string | null
  deliveryCity: string | null
  deliveryPostcode: string | null
  deliveryCountry: string | null
  deliveryNote: string | null
  paidAt: string | Date | null
  shippedAt: string | Date | null
  deliveredAt: string | Date | null
  completedAt: string | Date | null
  counterpartyUserId: string | null
  hasRated: boolean
  createdAt: string | Date
  updatedAt: string | Date
  myRole: string
  counterpartyName: string | null
  counterpartyJoined: boolean
}

function iso(value: string | Date | null | undefined): string | undefined {
  return value ? new Date(value).toISOString() : undefined
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
    delivery: row.deliveryStreet
      ? {
          name: row.deliveryName ?? "",
          phone: row.deliveryPhone ?? "",
          street: row.deliveryStreet,
          city: row.deliveryCity ?? "",
          postcode: row.deliveryPostcode ?? "",
          country: row.deliveryCountry ?? "",
          note: row.deliveryNote ?? "",
        }
      : undefined,
    paidAt: iso(row.paidAt),
    shippedAt: iso(row.shippedAt),
    deliveredAt: iso(row.deliveredAt),
    completedAt: iso(row.completedAt),
    hasRated: row.hasRated,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}
