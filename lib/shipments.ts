import type { shipments } from "@/db/schema"
import { validatePackageDimensions, type ServiceTier } from "@/lib/shipping-rates"

export type ShipmentStatus = "arrived" | "in-transit" | "pending"
export type ShipmentProvider = "internal" | "eurosender" | "sendcloud"

/** Structured postal address + contact for one side of a shipment. Country is ISO 3166-1 alpha-2. */
export interface ShipmentAddress {
  country: string
  zip: string
  city: string
  street: string
  phone: string
  email: string
}

/** Senders are always inside the EU. ISO 3166-1 alpha-2 codes. */
export const EU_COUNTRIES: { code: string; name: string }[] = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
]

const EU_COUNTRY_CODES = new Set(EU_COUNTRIES.map((c) => c.code))

/** Destinations outside the EU — these need customs paperwork, which only Sendcloud bookings carry. */
export const NON_EU_DESTINATIONS: { code: string; name: string }[] = [{ code: "CH", name: "Switzerland" }]

export const DESTINATION_COUNTRIES = [...EU_COUNTRIES, ...NON_EU_DESTINATIONS].sort((a, b) => a.name.localeCompare(b.name))

const NON_EU_DESTINATION_CODES = new Set(NON_EU_DESTINATIONS.map((c) => c.code))

/** True when parcels to this country cross an EU customs border. */
export function needsCustoms(country: string | null | undefined): boolean {
  return !!country && NON_EU_DESTINATION_CODES.has(country.trim().toUpperCase())
}

/** Where goods are usually made, for the customs "country of origin" — EU plus the common makers. */
export const ORIGIN_COUNTRIES = [
  ...EU_COUNTRIES,
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "MA", name: "Morocco" },
  { code: "CH", name: "Switzerland" },
  { code: "TR", name: "Türkiye" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
].sort((a, b) => a.name.localeCompare(b.name))

/** Why the goods cross the border — Sendcloud's `export_reason` values. */
export const EXPORT_REASONS = [
  { id: "commercial_goods", label: "Sale of goods" },
  { id: "gift", label: "Gift" },
  { id: "personal_use", label: "Personal belongings" },
  { id: "commercial_sample", label: "Sample" },
  { id: "returned_goods", label: "Returned goods" },
] as const

export type ExportReason = (typeof EXPORT_REASONS)[number]["id"]

/** Customs declaration for one line of identical goods (e.g. "3 leather handbags"). */
export interface CustomsDetails {
  /** Harmonized System code, 6–10 digits (leather handbags: 420221). */
  hsCode: string
  /** Where the goods were made, ISO alpha-2. */
  originCountry: string
  /** Number of identical items in the box. */
  quantity: number
  exportReason: ExportReason
  /** Sender's VAT number — makes it a commercial export; without it the export is private. */
  senderVatNumber?: string | null
}

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
  senderAddress?: ShipmentAddress | null
  receiverAddress?: ShipmentAddress | null
  /** Day the courier collects, YYYY-MM-DD. Required when booking with a real carrier. */
  pickupDate?: string | null
  /** What's in the box — printed on the carrier's paperwork. */
  contents?: string | null
  /** Declared value in EUR, used for the carrier's liability cover. */
  declaredValueEur?: number | null
  /** Required when the receiver is outside the EU (see needsCustoms). */
  customs?: CustomsDetails | null
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
  provider: ShipmentProvider
  providerOrderCode: string | null
  carrierName: string | null
  trackingUrl: string | null
  labelUrl: string | null
  /** Customs declaration PDF for shipments leaving the EU, served through our proxy. */
  customsDocumentsUrl: string | null
  pickupDate: string | null
  senderAddress: ShipmentAddress | null
  receiverAddress: ShipmentAddress | null
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

const ADDRESS_FIELDS: (keyof ShipmentAddress)[] = ["country", "zip", "city", "street", "phone", "email"]

export function validateShipmentAddress(address: unknown, label: "sender" | "receiver"): string | null {
  if (!address || typeof address !== "object") return `Missing ${label} address`
  const a = address as Record<string, unknown>
  for (const field of ADDRESS_FIELDS) {
    if (typeof a[field] !== "string" || !(a[field] as string).trim()) {
      return `Invalid ${label} ${field}`
    }
  }
  const country = (a.country as string).trim().toUpperCase()
  if (!EU_COUNTRY_CODES.has(country) && !(label === "receiver" && NON_EU_DESTINATION_CODES.has(country))) {
    return label === "sender"
      ? "We only ship from inside the EU — unsupported sender country"
      : "We only ship within the EU and to Switzerland — unsupported receiver country"
  }
  if (!/^\S+@\S+\.\S+$/.test((a.email as string).trim())) return `Invalid ${label} email`
  if (!/^\+?[\d\s()-]{6,20}$/.test((a.phone as string).trim())) return `Invalid ${label} phone`
  return null
}

/** YYYY-MM-DD, not in the past. Courier calendars (weekends, holidays) are checked by the carrier. */
export function validatePickupDate(value: unknown, today: Date = new Date()): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Invalid pickup date"
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "Invalid pickup date"
  if (value < today.toISOString().slice(0, 10)) return "Pickup date is in the past"
  return null
}

export function normalizeShipmentAddress(a: ShipmentAddress): ShipmentAddress {
  return {
    country: a.country.trim().toUpperCase(),
    zip: a.zip.trim(),
    city: a.city.trim(),
    street: a.street.trim(),
    // Carriers reject formatted numbers ("+372 5555 1234") — store plain digits with the leading +.
    phone: a.phone.replace(/[\s()-]/g, ""),
    email: a.email.trim(),
  }
}

/** One-line summary used for the legacy free-text location columns and table display. */
export function formatShipmentAddress(a: ShipmentAddress): string {
  return `${a.street}, ${a.zip} ${a.city}, ${a.country}`
}

export function validateShipmentCreatePayload(payload: Partial<ShipmentCreatePayload>): string | null {
  const error = validateShared(payload)
  if (error) return error
  for (const [key, label] of [["senderAddress", "sender"], ["receiverAddress", "receiver"]] as const) {
    if (payload[key] !== undefined && payload[key] !== null) {
      const addressError = validateShipmentAddress(payload[key], label)
      if (addressError) return addressError
    }
  }
  if (payload.dealId !== undefined && payload.dealId !== null && typeof payload.dealId !== "string") {
    return "Invalid dealId"
  }
  if (payload.pickupDate !== undefined && payload.pickupDate !== null) {
    const pickupError = validatePickupDate(payload.pickupDate)
    if (pickupError) return pickupError
  }
  if (payload.contents !== undefined && payload.contents !== null) {
    if (typeof payload.contents !== "string" || payload.contents.length > 100) return "Invalid contents"
  }
  if (payload.declaredValueEur !== undefined && payload.declaredValueEur !== null) {
    const v = payload.declaredValueEur
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100_000) return "Invalid declared value"
  }
  if (needsCustoms(payload.receiverAddress?.country)) {
    if (!payload.contents?.trim()) return "Describe the contents for customs"
    if (!payload.declaredValueEur || payload.declaredValueEur <= 0) return "Customs needs the value of the goods"
    const customsError = validateCustomsDetails(payload.customs)
    if (customsError) return customsError
  }
  return null
}

const EXPORT_REASON_IDS = new Set<string>(EXPORT_REASONS.map((r) => r.id))

export function validateCustomsDetails(customs: unknown): string | null {
  if (!customs || typeof customs !== "object") return "Customs details are required outside the EU"
  const c = customs as Record<string, unknown>
  if (typeof c.hsCode !== "string" || !/^\d{6,10}$/.test(c.hsCode.replace(/[\s.]/g, ""))) {
    return "Invalid HS code — use 6 to 10 digits"
  }
  if (typeof c.originCountry !== "string" || !/^[A-Za-z]{2}$/.test(c.originCountry.trim())) {
    return "Invalid country of manufacture"
  }
  if (typeof c.quantity !== "number" || !Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > 999) {
    return "Invalid number of items"
  }
  if (typeof c.exportReason !== "string" || !EXPORT_REASON_IDS.has(c.exportReason)) return "Invalid export reason"
  if (c.senderVatNumber !== undefined && c.senderVatNumber !== null && c.senderVatNumber !== "") {
    if (typeof c.senderVatNumber !== "string" || !/^[A-Za-z]{2}[A-Za-z0-9]{2,13}$/.test(c.senderVatNumber.replace(/\s/g, ""))) {
      return "Invalid sender VAT number — e.g. IT12345678901"
    }
  }
  return null
}

export function normalizeCustomsDetails(c: CustomsDetails): CustomsDetails {
  const vat = c.senderVatNumber?.replace(/\s/g, "").toUpperCase()
  return {
    hsCode: c.hsCode.replace(/[\s.]/g, ""),
    originCountry: c.originCountry.trim().toUpperCase(),
    quantity: c.quantity,
    exportReason: c.exportReason,
    senderVatNumber: vat || null,
  }
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
    provider: row.provider as ShipmentProvider,
    providerOrderCode: row.providerOrderCode,
    carrierName: row.carrierName,
    trackingUrl: row.trackingUrl,
    // Sendcloud labels need our API credentials, so the browser downloads them through our proxy.
    labelUrl: row.labelUrl && row.provider === "sendcloud" ? `/api/shipments/${row.id}/label/` : row.labelUrl,
    customsDocumentsUrl:
      row.labelUrl && row.provider === "sendcloud" && needsCustoms(row.receiverAddress?.country)
        ? `/api/shipments/${row.id}/label/?doc=customs-declaration`
        : null,
    pickupDate: row.pickupDate ?? null,
    senderAddress: row.senderAddress ?? null,
    receiverAddress: row.receiverAddress ?? null,
    dealId: row.dealId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}
