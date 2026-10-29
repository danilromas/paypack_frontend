import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import type { ServiceTier } from "@/lib/shipping-rates"
import type { CustomsDetails, ShipmentAddress, ShipmentStatus } from "@/lib/shipments"

/**
 * Thin client for the Sendcloud API v3 (https://sendcloud.dev/api/v3). Sendcloud only books from the
 * countries its carrier contracts cover (our account is Italian), so it handles senders in
 * SENDCLOUD_SENDER_COUNTRIES and Eurosender keeps everything else. Without the key pair the app falls
 * back to Eurosender / the internal estimate.
 */

const BASE_URL = "https://panel.sendcloud.sc/api/v3"

export function isSendcloudEnabled(): boolean {
  return Boolean(process.env.SENDCLOUD_PUBLIC_KEY && process.env.SENDCLOUD_SECRET_KEY)
}

/** Sender countries our Sendcloud contracts can ship from (ISO alpha-2, comma separated). */
export function sendcloudSenderCountries(): string[] {
  return (process.env.SENDCLOUD_SENDER_COUNTRIES ?? "IT")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
}

export function sendcloudServesSender(country: string | null | undefined): boolean {
  return isSendcloudEnabled() && !!country && sendcloudSenderCountries().includes(country.trim().toUpperCase())
}

/**
 * Test mode books Sendcloud's "Unstamped letter" option for every shipment: a real announced label that
 * is never charged and never collected. Used to exercise the whole flow in production safely.
 */
export const TEST_SHIPPING_OPTION = "sendcloud:letter"

export function isSendcloudTestMode(): boolean {
  return process.env.SENDCLOUD_TEST_MODE === "true"
}

export class SendcloudError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

function authHeader(): string {
  const { SENDCLOUD_PUBLIC_KEY: pub, SENDCLOUD_SECRET_KEY: secret } = process.env
  if (!pub || !secret) throw new SendcloudError("Sendcloud is not configured", 503)
  return `Basic ${Buffer.from(`${pub}:${secret}`).toString("base64")}`
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  })

  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    throw new SendcloudError(extractErrorMessage(data) ?? `Sendcloud request failed (${res.status})`, res.status, data)
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

interface ApiError {
  code?: string
  title?: string
  detail?: string
  source?: { pointer?: string; parameter?: string } | null
}

function formatErrors(errors: ApiError[]): string | null {
  const parts = errors
    .map((e) => {
      const where = e.source?.pointer?.replace(/^\/data\//, "").replace(/^\//, "") || e.source?.parameter
      const what = e.detail || e.title || e.code
      return [where, what].filter(Boolean).join(": ")
    })
    .filter(Boolean)
  return parts.length > 0 ? parts.join("; ") : null
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (Array.isArray(d.errors)) return formatErrors(d.errors as ApiError[])
  for (const key of ["detail", "message", "error"]) {
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
  /** Present for destinations outside the EU; turned into parcel items and customs information. */
  customs?: CustomsDetails | null
}

function toApiAddress(a: ShipmentAddress & { name: string }) {
  return {
    name: a.name,
    address_line_1: a.street,
    postal_code: a.zip,
    city: a.city,
    country_code: a.country.toUpperCase(),
    email: a.email,
    phone_number: a.phone,
  }
}

function toApiParcel(pkg: PackageInput, customs?: CustomsDetails | null) {
  return {
    weight: { value: pkg.weightKg.toFixed(3), unit: "kg" },
    // Round up so we never under-declare to the carrier.
    dimensions: {
      length: String(Math.ceil(pkg.lengthCm)),
      width: String(Math.ceil(pkg.widthCm)),
      height: String(Math.ceil(pkg.heightCm)),
      unit: "cm",
    },
    ...(customs ? { parcel_items: [toParcelItem(pkg, customs)] } : {}),
  }
}

/**
 * One customs line for the whole box: Sendcloud wants per-item weight and price, so the parcel's weight and
 * declared value are split evenly over the item count.
 */
export function toParcelItem(pkg: PackageInput, customs: CustomsDetails) {
  const unitWeight = Math.max(0.001, pkg.weightKg / customs.quantity)
  const unitValue = Math.max(0.01, (pkg.valueEur ?? 0) / customs.quantity)
  return {
    description: pkg.content?.trim() || "Goods",
    quantity: customs.quantity,
    weight: { value: unitWeight.toFixed(3), unit: "kg" },
    price: { value: unitValue.toFixed(2), currency: "EUR" },
    hs_code: customs.hsCode,
    origin_country: customs.originCountry,
  }
}

/**
 * Invoice and export details for the customs documents. Without a sender VAT number the export is private;
 * Sendcloud rejects a commercial export that has none.
 */
export function toCustomsInformation(customs: CustomsDetails, invoiceNumber: string, today: Date = new Date()) {
  return {
    invoice_number: invoiceNumber,
    invoice_date: today.toISOString().slice(0, 10),
    export_reason: customs.exportReason,
    export_type: customs.senderVatNumber ? "commercial_b2c" : "private",
    ...(customs.senderVatNumber
      ? {
          tax_numbers: {
            sender: [{ name: "VAT", country_code: customs.senderVatNumber.slice(0, 2), value: customs.senderVatNumber }],
          },
        }
      : {}),
  }
}

interface Price {
  value: string
  currency: string
}

export interface ShippingOption {
  code: string
  name?: string
  carrier?: { code?: string; name?: string } | null
  functionalities?: {
    priority?: string | null
    last_mile?: string | null
    first_mile?: string | null
    age_check?: number | null
  } | null
  requirements?: { is_service_point_required?: boolean; export_documents?: boolean } | null
  quote_error?: { code: string; title: string } | null
  quotes?: { lead_time?: number | null; price?: { total?: Price | null } | null }[] | null
}

export interface ServiceQuote {
  tier: ServiceTier
  /** Sendcloud shipping option code — what we announce the shipment with. */
  serviceType: string
  carrierName: string | null
  priceGross: number
  currency: string
  /** Business days, same format as Eurosender's ("1", "3"). */
  estimatedDelivery: string | null
  minPickupDate: string | null
  pickupExcludedDates: string[]
}

/** Sendcloud's own priority labels mapped onto our three wizard tiers. */
const PRIORITY_TO_TIER: Record<string, ServiceTier> = {
  economical: "economy",
  standard: "standard",
  priority: "express",
  express: "express",
}

function optionPrice(o: ShippingOption): Price | null {
  const total = o.quotes?.[0]?.price?.total
  return total && Number.isFinite(Number(total.value)) ? total : null
}

/**
 * Cheaper wins. On a tie the carrier's base product wins over its variants ("…/dropoff", "…/puntoposte"),
 * which narrow how the parcel is handed over; the base one leaves pickup and drop-off both open.
 */
function isBetterOption(option: ShippingOption, price: Price, current: ShippingOption, currentPrice: Price): boolean {
  const diff = Number(price.value) - Number(currentPrice.value)
  if (diff !== 0) return diff < 0
  return !option.code.includes("/") && current.code.includes("/")
}

/**
 * Picks the option to sell for each tier: home delivery only (no service-point or locker drop at the
 * receiver's end), no age-check variants, priced, and the cheapest one within the tier. Options that need
 * customs paperwork stay in — bookings outside the EU always carry it.
 */
export function pickTierQuotes(options: ShippingOption[]): ServiceQuote[] {
  const best = new Map<ServiceTier, { option: ShippingOption; price: Price }>()
  for (const option of options) {
    const price = optionPrice(option)
    if (!price || option.quote_error) continue
    if (option.requirements?.is_service_point_required || option.functionalities?.age_check) continue
    const lastMile = option.functionalities?.last_mile
    if (lastMile && lastMile !== "home_delivery") continue
    const tier = PRIORITY_TO_TIER[option.functionalities?.priority ?? "standard"] ?? "standard"
    const current = best.get(tier)
    if (!current || isBetterOption(option, price, current.option, current.price)) best.set(tier, { option, price })
  }

  const order: ServiceTier[] = ["economy", "standard", "express"]
  return order.flatMap((tier) => {
    const hit = best.get(tier)
    if (!hit) return []
    const leadHours = hit.option.quotes?.[0]?.lead_time
    return [
      {
        tier,
        serviceType: hit.option.code,
        carrierName: hit.option.carrier?.name ?? null,
        priceGross: Math.round(Number(hit.price.value) * 100) / 100,
        currency: hit.price.currency,
        estimatedDelivery: typeof leadHours === "number" && leadHours > 0 ? String(Math.ceil(leadHours / 24)) : null,
        minPickupDate: null,
        pickupExcludedDates: [],
      },
    ]
  })
}

/** Live prices for each of our tiers that Sendcloud can serve on this route. */
export async function getQuotes(input: ShipmentInput): Promise<ServiceQuote[]> {
  const data = await request<{ data: ShippingOption[] | null }>("POST", "/shipping-options", {
    from_address: {
      country_code: input.sender.country.toUpperCase(),
      postal_code: input.sender.zip,
      city: input.sender.city,
      address_line_1: input.sender.street,
    },
    to_address: {
      country_code: input.receiver.country.toUpperCase(),
      postal_code: input.receiver.zip,
      city: input.receiver.city,
      address_line_1: input.receiver.street,
    },
    parcels: [toApiParcel(input.pkg)],
    calculate_quotes: true,
  })
  return pickSellableQuotes(data.data ?? [], isSendcloudTestMode())
}

/**
 * The free test letter is never sold: it would undercut every real carrier at 0 €. Test mode shows it only
 * when the account has no real carrier for the route yet, so the flow can still be exercised end to end.
 */
export function pickSellableQuotes(options: ShippingOption[], testMode: boolean): ServiceQuote[] {
  const real = pickTierQuotes(options.filter((o) => o.code !== TEST_SHIPPING_OPTION))
  if (real.length > 0 || !testMode) return real
  return pickTierQuotes(options.filter((o) => o.code === TEST_SHIPPING_OPTION))
}

interface ApiParcel {
  id: number
  status?: { code?: string; message?: string } | null
  tracking_number?: string | null
  tracking_url?: string | null
  documents?: { type?: string; document_type?: string; link?: string }[] | null
}

export interface ApiShipment {
  id: string
  carrier?: { code?: string; name?: string } | null
  parcels?: ApiParcel[]
  errors?: ApiError[]
}

export interface BookedShipment {
  shipmentId: string
  parcelId: number | null
  carrierName: string | null
  /** Sendcloud's authenticated document link — served to users through our label proxy. */
  labelUrl: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  statusCode: string | null
  statusMessage: string | null
}

export function toBookedShipment(data: ApiShipment): BookedShipment {
  const parcel = data.parcels?.[0]
  const label = parcel?.documents?.find((d) => (d.document_type ?? d.type) === "label")
  return {
    shipmentId: data.id,
    parcelId: parcel?.id ?? null,
    carrierName: data.carrier?.name ?? null,
    labelUrl: label?.link ?? (parcel?.id ? `${BASE_URL}/parcels/${parcel.id}/documents/label` : null),
    trackingNumber: parcel?.tracking_number || null,
    trackingUrl: parcel?.tracking_url || null,
    statusCode: parcel?.status?.code ?? null,
    statusMessage: parcel?.status?.message ?? null,
  }
}

/**
 * Creates and announces a shipment synchronously, so we get the label and tracking number in the same
 * call. Re-quotes server-side to resolve the tier to a shipping option instead of trusting the client.
 * `reference` is our shipment id — Sendcloud rejects a second shipment with the same one (409).
 */
export async function createShipment(
  input: ShipmentInput,
  tier: ServiceTier,
  reference: string,
): Promise<BookedShipment & { priceGross: number | null; currency: string | null }> {
  const testMode = isSendcloudTestMode()
  // In test mode the quote is informational only, so a route without priced carriers still books.
  const quote = (await getQuotes(input).catch((error) => (testMode ? [] : Promise.reject(error)))).find(
    (q) => q.tier === tier,
  )
  if (!quote && !testMode) {
    throw new SendcloudError("This service is no longer available on this route — compare prices again", 409)
  }
  const optionCode = testMode ? TEST_SHIPPING_OPTION : quote!.serviceType

  const valueEur = Math.max(1, Math.round(input.pkg.valueEur ?? 1))
  const res = await request<{ data: ApiShipment }>("POST", "/shipments/announce", {
    from_address: toApiAddress(input.sender),
    to_address: toApiAddress(input.receiver),
    ship_with: { type: "shipping_option_code", properties: { shipping_option_code: optionCode } },
    parcels: [toApiParcel(input.pkg, input.customs)],
    ...(input.customs ? { customs_information: toCustomsInformation(input.customs, `PP-${reference.slice(0, 8).toUpperCase()}`) } : {}),
    order_number: reference.slice(0, 8).toUpperCase(),
    external_reference_id: reference,
    reference: input.pkg.content?.trim() || "Goods",
    total_order_price: { value: valueEur.toFixed(2), currency: "EUR" },
    label_details: { mime_type: "application/pdf", dpi: 72 },
  })

  const booked = toBookedShipment(res.data)
  // The announce call can succeed at HTTP level while the carrier rejects the label.
  if (booked.statusCode === "ANNOUNCEMENT_FAILED" || (res.data.errors?.length ?? 0) > 0) {
    const message = formatErrors(res.data.errors ?? []) ?? booked.statusMessage ?? "Carrier announcement failed"
    throw new SendcloudError(message, 422, res.data)
  }
  // The test letter is free whatever the quote said, so never record a carrier price for it.
  return { ...booked, priceGross: testMode ? 0 : (quote?.priceGross ?? null), currency: testMode ? "EUR" : (quote?.currency ?? null) }
}

export async function getShipment(shipmentId: string): Promise<BookedShipment> {
  const res = await request<{ data: ApiShipment }>("GET", `/shipments/${encodeURIComponent(shipmentId)}`)
  return toBookedShipment(res.data)
}

export async function cancelShipment(shipmentId: string): Promise<"cancelled" | "queued"> {
  const res = await request<{ data?: { status?: string } }>("POST", `/shipments/${encodeURIComponent(shipmentId)}/cancel`)
  return res.data?.status === "queued" ? "queued" : "cancelled"
}

export type ParcelDocument = "label" | "customs-declaration"

/** The customs declaration sits next to the label: same parcel, different document type. */
export function documentUrl(labelUrl: string, type: ParcelDocument): string {
  return type === "label" ? labelUrl : labelUrl.replace(/\/documents\/label$/, `/documents/${type}`)
}

/** Downloads a parcel document (PDF) through our credentials. Only Sendcloud's own host is ever fetched. */
export async function fetchDocumentPdf(url: string): Promise<ArrayBuffer> {
  if (!url.startsWith(`${BASE_URL}/`)) throw new SendcloudError("Unexpected document location", 400)
  const res = await fetch(url, {
    headers: { Authorization: authHeader(), Accept: "application/pdf" },
    cache: "no-store",
  })
  if (!res.ok) throw new SendcloudError(`Document download failed (${res.status})`, res.status)
  return res.arrayBuffer()
}

const DELIVERED = new Set(["DELIVERED", "SHIPMENT_COLLECTED_BY_CUSTOMER"])

/**
 * Collapses Sendcloud's parcel statuses onto our three-step timeline. Anything before the carrier has the
 * box (announcing, ready to send, cancellation) stays pending; everything after the first scan is in transit.
 */
export function mapParcelStatus(code: string | null): ShipmentStatus {
  if (!code) return "pending"
  const c = code.toUpperCase()
  if (DELIVERED.has(c)) return "arrived"
  if (
    c.startsWith("ANNOUNC") ||
    c.startsWith("BEING_ANNOUNCED") ||
    c.includes("CANCEL") ||
    c === "READY_TO_SEND" ||
    c === "NO_LABEL" ||
    c === "UNKNOWN"
  ) {
    return "pending"
  }
  return "in-transit"
}

/**
 * HMAC-SHA256 of the raw body, hex encoded, as sent in `Sendcloud-Signature`. API integrations sign with
 * the Webhook Signature Key set on the integration; older ones use the secret key.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SENDCLOUD_WEBHOOK_SIGNATURE_KEY || process.env.SENDCLOUD_SECRET_KEY
  if (!secret || !signature) return false
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"))
  const received = Buffer.from(signature.trim().toLowerCase())
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/** What a parcel-status webhook lets us match on: the v3 shipment id and the carrier tracking number. */
export function extractWebhookParcel(body: unknown): { shipmentId: string | null; trackingNumber: string | null } {
  if (!body || typeof body !== "object") return { shipmentId: null, trackingNumber: null }
  const parcel = (body as { parcel?: { shipment_uuid?: unknown; tracking_number?: unknown } }).parcel
  return {
    shipmentId: typeof parcel?.shipment_uuid === "string" && parcel.shipment_uuid ? parcel.shipment_uuid : null,
    trackingNumber: typeof parcel?.tracking_number === "string" && parcel.tracking_number ? parcel.tracking_number : null,
  }
}
