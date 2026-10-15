import "server-only"
import type { ServiceTier } from "@/lib/shipping-rates"
import type { ShipmentAddress, ShipmentStatus } from "@/lib/shipments"

/**
 * Thin client for the Eurosender API (https://integrators.eurosender.com/apis).
 * Eurosender is a multi-carrier broker (DPD, UPS, DHL, …) that accepts Estonian senders, which is why
 * it's used here instead of Sendcloud. When EUROSENDER_API_KEY is unset the app keeps using the
 * internal estimate/tracking flow, so nothing breaks in local dev.
 */

const BASE_URLS = {
  sandbox: "https://sandbox-api.eurosender.com",
  production: "https://api.eurosender.com",
} as const

export function isEurosenderEnabled(): boolean {
  return Boolean(process.env.EUROSENDER_API_KEY)
}

function baseUrl(): string {
  return process.env.EUROSENDER_ENV === "production" ? BASE_URLS.production : BASE_URLS.sandbox
}

/** Our three wizard tiers mapped onto Eurosender service types. */
export const TIER_TO_SERVICE_TYPE: Record<ServiceTier, string> = {
  economy: "selection",
  standard: "regular_plus",
  express: "express",
}

export class EurosenderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const apiKey = process.env.EUROSENDER_API_KEY
  if (!apiKey) throw new EurosenderError("Eurosender is not configured", 503)

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  })

  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    throw new EurosenderError(extractErrorMessage(data) ?? `Eurosender request failed (${res.status})`, res.status, data)
  }
  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (Array.isArray(d.violations) && d.violations.length > 0) {
    return d.violations
      .map((v) => {
        const item = v as Record<string, unknown>
        return [item.propertyPath, item.message].filter(Boolean).join(": ")
      })
      .join("; ")
  }
  for (const key of ["detail", "message", "title", "error"]) {
    if (typeof d[key] === "string") return d[key] as string
  }
  return null
}

export interface PackageInput {
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  content?: string
  valueEur?: number
}

export interface ShipmentInput {
  sender: ShipmentAddress & { name: string }
  receiver: ShipmentAddress & { name: string }
  pkg: PackageInput
}

/**
 * Courier collects from the sender's door and delivers to the receiver's door. Eurosender also offers
 * shop_to_door / door_to_shop variants of the same service; we only sell door-to-door.
 */
const SERVICE_SUBTYPE = "door_to_door"

/** Eurosender wants a full timestamp; midday UTC keeps the calendar date stable in every EU timezone. */
function toApiPickupDate(date: string): string {
  return `${date}T12:00:00+00:00`
}

function toApiAddress(a: ShipmentAddress) {
  return { country: a.country.toUpperCase(), zip: a.zip, city: a.city, street: a.street }
}

function toApiContact(a: ShipmentAddress & { name: string }) {
  return { name: a.name, phone: a.phone, email: a.email }
}

function toApiParcels(pkg: PackageInput) {
  return {
    packages: [
      {
        parcelId: "A00001",
        quantity: 1,
        // Eurosender wants whole centimetres; round up so we never under-declare.
        width: Math.ceil(pkg.widthCm),
        height: Math.ceil(pkg.heightCm),
        length: Math.ceil(pkg.lengthCm),
        weight: pkg.weightKg,
        content: pkg.content?.trim() || "Goods",
        value: Math.max(1, Math.round(pkg.valueEur ?? 1)),
      },
    ],
  }
}

export interface ServiceQuote {
  tier: ServiceTier
  serviceType: string
  priceGross: number
  currency: string
  /** Business days, as Eurosender reports them ("1", "3-4"). */
  estimatedDelivery: string | null
  /** Earliest day the courier can collect (YYYY-MM-DD). */
  minPickupDate: string | null
  /** Days the courier won't collect — weekends, holidays (YYYY-MM-DD). */
  pickupExcludedDates: string[]
}

interface QuoteOption {
  name: string
  serviceSubtype?: string
  edt?: string
  minPickupDate?: string
  pickupExcludedDates?: string[]
  price?: { original?: { currencyCode: string; gross: number; net: number } }
}

interface QuoteResponse {
  options?: { serviceTypes?: QuoteOption[] }
}

/** "2026-10-16T00:00:00+02:00" → "2026-10-16" — the date as Eurosender means it, ignoring the offset. */
function datePart(value: string | undefined | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null
}

/**
 * Picks the option to sell for each of our tiers: door-to-door only, and the cheapest one if Eurosender
 * returns several for the same service type.
 */
export function pickTierQuotes(options: QuoteOption[]): ServiceQuote[] {
  const quotes: ServiceQuote[] = []
  for (const [tier, serviceType] of Object.entries(TIER_TO_SERVICE_TYPE) as [ServiceTier, string][]) {
    const candidates = options.filter(
      (o) => o.name === serviceType && (o.serviceSubtype ?? SERVICE_SUBTYPE) === SERVICE_SUBTYPE && o.price?.original,
    )
    if (candidates.length === 0) continue
    const best = candidates.reduce((a, b) => (b.price!.original!.gross < a.price!.original!.gross ? b : a))
    const price = best.price!.original!
    quotes.push({
      tier,
      serviceType,
      priceGross: price.gross,
      currency: price.currencyCode,
      estimatedDelivery: best.edt ?? null,
      minPickupDate: datePart(best.minPickupDate),
      pickupExcludedDates: (best.pickupExcludedDates ?? []).map(datePart).filter((d): d is string => d !== null),
    })
  }
  return quotes
}

/** Live prices for each of our tiers that Eurosender can serve on this route. */
export async function getQuotes(input: ShipmentInput): Promise<ServiceQuote[]> {
  const data = await request<QuoteResponse>("POST", "/v1/quotes", {
    shipment: {
      pickupAddress: toApiAddress(input.sender),
      deliveryAddress: toApiAddress(input.receiver),
    },
    parcels: toApiParcels(input.pkg),
    paymentMethod: paymentMethod(),
    currencyCode: "EUR",
  })

  return pickTierQuotes(data.options?.serviceTypes ?? [])
}

function paymentMethod(): "credit" | "deferred" {
  return process.env.EUROSENDER_PAYMENT_METHOD === "credit" ? "credit" : "deferred"
}

/** Per-package tracking as the order endpoints return it (the /tracking endpoint uses different names). */
interface OrderTracking {
  number?: string | null
  url?: string | null
}

export interface OrderResponse {
  orderCode: string
  status?: unknown
  price?: { original?: { gross?: number; currencyCode?: string } }
  courier?: { shortName?: string | null } | null
  labelLink?: string | null
  parcels?: { packages?: { tracking?: OrderTracking | null }[] }
}

export interface CreatedOrder {
  orderCode: string
  carrierName: string | null
  labelUrl: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  priceGross: number | null
  currency: string | null
}

/**
 * Books a real order. `pickupDate` is the day the courier collects (YYYY-MM-DD); Eurosender validates it
 * against the courier's calendar and rejects weekends/holidays with a 422.
 */
export async function createOrder(input: ShipmentInput, tier: ServiceTier, pickupDate: string): Promise<CreatedOrder> {
  const data = await request<OrderResponse>("POST", "/v1/orders", {
    shipment: {
      pickupAddress: toApiAddress(input.sender),
      deliveryAddress: toApiAddress(input.receiver),
      pickupContact: toApiContact(input.sender),
      deliveryContact: toApiContact(input.receiver),
      pickupDate: toApiPickupDate(pickupDate),
    },
    parcels: toApiParcels(input.pkg),
    serviceType: TIER_TO_SERVICE_TYPE[tier],
    serviceSubtype: SERVICE_SUBTYPE,
    paymentMethod: paymentMethod(),
    currencyCode: "EUR",
    labelFormat: "pdf",
    // Eurosender requires a full contact (name, phone, email) for whoever owns the order.
    orderContact: toApiContact(input.sender),
  })
  return toCreatedOrder(data)
}

export async function getOrder(orderCode: string): Promise<CreatedOrder> {
  return toCreatedOrder(await request<OrderResponse>("GET", `/v1/orders/${encodeURIComponent(orderCode)}`))
}

export function toCreatedOrder(data: OrderResponse): CreatedOrder {
  const tracking = data.parcels?.packages?.[0]?.tracking ?? null
  return {
    orderCode: data.orderCode,
    carrierName: data.courier?.shortName ?? null,
    labelUrl: data.labelLink ?? null,
    trackingNumber: tracking?.number ?? null,
    trackingUrl: tracking?.url ?? null,
    priceGross: data.price?.original?.gross ?? null,
    currency: data.price?.original?.currencyCode ?? null,
  }
}

export type EurosenderTrackingStatus =
  | "InfoReceived"
  | "InTransit"
  | "OutForDelivery"
  | "AttemptFail"
  | "Delivered"
  | "AvailableForPickup"
  | "Exception"
  | "Expired"
  | "Pending"
  | "Canceled"

export interface TrackingSnapshot {
  trackingNumber: string | null
  status: EurosenderTrackingStatus | null
  lastMessage: string | null
}

interface TrackingResponse {
  parcels?: {
    trackingNumber?: string
    currentStatus?: EurosenderTrackingStatus
    checkpoints?: { message?: string | null; location?: string | null }[]
  }[]
}

export async function getTracking(orderCode: string): Promise<TrackingSnapshot> {
  const data = await request<TrackingResponse>("GET", `/v1/orders/${encodeURIComponent(orderCode)}/tracking`)
  const parcel = data.parcels?.[0]
  const last = parcel?.checkpoints?.at(-1)
  return {
    trackingNumber: parcel?.trackingNumber ?? null,
    status: parcel?.currentStatus ?? null,
    lastMessage: last ? [last.message, last.location].filter(Boolean).join(" — ") || null : null,
  }
}

export async function cancelOrder(orderCode: string): Promise<void> {
  await request("DELETE", `/v1/orders/${encodeURIComponent(orderCode)}`)
}

/** Collapses Eurosender's tracking states onto our three-step timeline. */
export function mapTrackingStatus(status: EurosenderTrackingStatus | null): ShipmentStatus {
  switch (status) {
    case "Delivered":
      return "arrived"
    case "InTransit":
    case "OutForDelivery":
    case "AttemptFail":
    case "AvailableForPickup":
    case "Exception":
      return "in-transit"
    default:
      return "pending"
  }
}

/**
 * Pulls every order code out of a webhook body. Label/submitted/tracking-ready/cancelled hooks carry a
 * top-level `orderCode`; delivery-status hooks wrap theirs in `notifications[]`.
 */
export function extractWebhookOrderCodes(body: unknown): string[] {
  const codes = new Set<string>()
  if (!body || typeof body !== "object") return []
  const b = body as Record<string, unknown>
  if (typeof b.orderCode === "string") codes.add(b.orderCode)
  if (Array.isArray(b.notifications)) {
    for (const n of b.notifications) {
      if (n && typeof n === "object" && typeof (n as Record<string, unknown>).orderCode === "string") {
        codes.add((n as Record<string, string>).orderCode)
      }
    }
  }
  return [...codes]
}
