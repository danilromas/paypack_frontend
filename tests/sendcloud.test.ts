import { createHmac } from "node:crypto"
import { afterEach, describe, expect, it } from "vitest"
import {
  documentUrl,
  extractWebhookParcel,
  mapParcelStatus,
  pickSellableQuotes,
  pickTierQuotes,
  sendcloudServesSender,
  toBookedShipment,
  toCustomsInformation,
  toParcelItem,
  verifyWebhookSignature,
  type ShippingOption,
} from "../lib/sendcloud"

const option = (
  code: string,
  price: string | null,
  extra: Partial<ShippingOption> & { priority?: string; lastMile?: string; leadTime?: number } = {},
): ShippingOption => ({
  code,
  carrier: { code: code.split(":")[0], name: code.split(":")[0].toUpperCase() },
  functionalities: { priority: extra.priority ?? "standard", last_mile: extra.lastMile ?? "home_delivery" },
  requirements: extra.requirements ?? { is_service_point_required: false, export_documents: false },
  quote_error: extra.quote_error ?? null,
  quotes: price === null ? null : [{ lead_time: extra.leadTime ?? 48, price: { total: { value: price, currency: "EUR" } } }],
})

describe("pickTierQuotes", () => {
  it("maps priorities onto tiers and keeps the cheapest home delivery per tier", () => {
    const quotes = pickTierQuotes([
      option("poste:economy", "6.90", { priority: "economical", leadTime: 96 }),
      option("brt:standard", "9.40"),
      option("ups:standard", "8.15"),
      option("inpost:locker", "3.00", { lastMile: "locker" }),
      option("ups:express", "21.00", { priority: "express", leadTime: 24 }),
      option("fedex:priority", "19.50", { priority: "priority", leadTime: 20 }),
    ])

    expect(quotes).toEqual([
      expect.objectContaining({ tier: "economy", serviceType: "poste:economy", priceGross: 6.9, estimatedDelivery: "4" }),
      expect.objectContaining({ tier: "standard", serviceType: "ups:standard", carrierName: "UPS", priceGross: 8.15, estimatedDelivery: "2" }),
      expect.objectContaining({ tier: "express", serviceType: "fedex:priority", priceGross: 19.5, estimatedDelivery: "1" }),
    ])
  })

  it("skips unpriced, errored, service-point and age-check options", () => {
    expect(
      pickTierQuotes([
        option("a:std", null),
        option("b:std", "5.00", { quote_error: { code: "no_price_for_route", title: "No price" } }),
        option("c:std", "5.00", { requirements: { is_service_point_required: true } }),
        { ...option("d:std", "5.00"), functionalities: { priority: null, last_mile: "home_delivery", age_check: 18 } },
      ]),
    ).toEqual([])
  })

  it("prefers the base product over its hand-over variants at the same price", () => {
    // Poste Italiane International Plus, Italy → Switzerland, in the order Sendcloud returned it.
    const quotes = pickTierQuotes([
      option("poste_it_delivery:internationalplus/puntoposte", "21.57"),
      option("poste_it_delivery:internationalplus/dropoff", "21.57"),
      option("poste_it_delivery:internationalplus", "21.57"),
    ])
    expect(quotes.map((q) => q.serviceType)).toEqual(["poste_it_delivery:internationalplus"])
  })

  it("keeps options that need customs documents and treats a missing priority as standard", () => {
    // FedEx International Connect Plus, Italy → Switzerland, as Sendcloud returns it.
    const fedex = {
      ...option("fedex:internationalconnect", "28.15000"),
      functionalities: { priority: null, last_mile: "home_delivery", first_mile: "pickup_dropoff" },
      requirements: { is_service_point_required: false, export_documents: true },
    }
    expect(pickTierQuotes([fedex])).toEqual([
      expect.objectContaining({ tier: "standard", serviceType: "fedex:internationalconnect", priceGross: 28.15 }),
    ])
  })
})

describe("pickSellableQuotes", () => {
  const letter = option("sendcloud:letter", "0")
  const fedex = option("fedex:internationalconnect", "28.15")

  it("never sells the free test letter next to a real carrier", () => {
    expect(pickSellableQuotes([letter, fedex], true).map((q) => q.serviceType)).toEqual(["fedex:internationalconnect"])
    expect(pickSellableQuotes([letter, fedex], false).map((q) => q.serviceType)).toEqual(["fedex:internationalconnect"])
  })

  it("falls back to the test letter only in test mode", () => {
    expect(pickSellableQuotes([letter], true).map((q) => q.serviceType)).toEqual(["sendcloud:letter"])
    expect(pickSellableQuotes([letter], false)).toEqual([])
  })
})

describe("customs", () => {
  const pkg = { weightKg: 3, lengthCm: 40, widthCm: 30, heightCm: 20, content: "Leather handbags", valueEur: 900 }

  it("splits weight and value evenly over the items", () => {
    expect(
      toParcelItem(pkg, { hsCode: "420221", originCountry: "IT", quantity: 3, exportReason: "commercial_goods" }),
    ).toEqual({
      description: "Leather handbags",
      quantity: 3,
      weight: { value: "1.000", unit: "kg" },
      price: { value: "300.00", currency: "EUR" },
      hs_code: "420221",
      origin_country: "IT",
    })
  })

  it("is a private export without a VAT number and a commercial one with it", () => {
    const today = new Date("2026-10-29T10:00:00Z")
    const base = { hsCode: "420221", originCountry: "IT", quantity: 1, exportReason: "commercial_goods" as const }
    expect(toCustomsInformation(base, "PP-1", today)).toEqual({
      invoice_number: "PP-1",
      invoice_date: "2026-10-29",
      export_reason: "commercial_goods",
      export_type: "private",
    })
    expect(toCustomsInformation({ ...base, senderVatNumber: "IT12345678901" }, "PP-1", today)).toMatchObject({
      export_type: "commercial_b2c",
      tax_numbers: { sender: [{ name: "VAT", country_code: "IT", value: "IT12345678901" }] },
    })
  })

  it("points the customs declaration at the label's parcel", () => {
    const label = "https://panel.sendcloud.sc/api/v3/parcels/42/documents/label"
    expect(documentUrl(label, "label")).toBe(label)
    expect(documentUrl(label, "customs-declaration")).toBe("https://panel.sendcloud.sc/api/v3/parcels/42/documents/customs-declaration")
  })
})

describe("mapParcelStatus", () => {
  it("keeps pre-collection states pending", () => {
    for (const code of ["ANNOUNCING", "READY_TO_SEND", "ANNOUNCED_NOT_COLLECTED", "CANCELLED", null]) {
      expect(mapParcelStatus(code)).toBe("pending")
    }
  })

  it("treats delivery and service-point collection as arrived", () => {
    expect(mapParcelStatus("DELIVERED")).toBe("arrived")
    expect(mapParcelStatus("SHIPMENT_COLLECTED_BY_CUSTOMER")).toBe("arrived")
  })

  it("treats everything after the first scan as in transit", () => {
    expect(mapParcelStatus("AT_SORTING_CENTRE")).toBe("in-transit")
    expect(mapParcelStatus("DRIVER_EN_ROUTE")).toBe("in-transit")
  })
})

describe("toBookedShipment", () => {
  it("reads label, tracking and carrier from an announced shipment", () => {
    expect(
      toBookedShipment({
        id: "sh_1",
        carrier: { code: "brt", name: "BRT" },
        parcels: [
          {
            id: 42,
            status: { code: "READY_TO_SEND", message: "Ready to send" },
            tracking_number: "BRT123",
            tracking_url: "https://track.example/BRT123",
            documents: [{ document_type: "label", link: "https://panel.sendcloud.sc/api/v3/parcels/42/documents/label" }],
          },
        ],
      }),
    ).toEqual({
      shipmentId: "sh_1",
      parcelId: 42,
      carrierName: "BRT",
      labelUrl: "https://panel.sendcloud.sc/api/v3/parcels/42/documents/label",
      trackingNumber: "BRT123",
      trackingUrl: "https://track.example/BRT123",
      statusCode: "READY_TO_SEND",
      statusMessage: "Ready to send",
    })
  })
})

describe("webhooks", () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
  })

  it("accepts only bodies signed with our secret key", () => {
    process.env.SENDCLOUD_SECRET_KEY = "secretkey"
    // Sendcloud's documented example.
    expect(verifyWebhookSignature('{"key": "value"}', "1eed4b3d41f4653ac64fd56f1bf1cbfd349e4482cbc11dff7134bd93e5da4b0a")).toBe(true)
    const body = '{"action":"parcel_status_changed"}'
    const sig = createHmac("sha256", "secretkey").update(body).digest("hex")
    expect(verifyWebhookSignature(body, sig)).toBe(true)
    expect(verifyWebhookSignature(body + " ", sig)).toBe(false)
    expect(verifyWebhookSignature(body, null)).toBe(false)
  })

  it("extracts the shipment id and tracking number", () => {
    expect(extractWebhookParcel({ parcel: { shipment_uuid: "abc", tracking_number: "T1" } })).toEqual({
      shipmentId: "abc",
      trackingNumber: "T1",
    })
    expect(extractWebhookParcel(null)).toEqual({ shipmentId: null, trackingNumber: null })
  })

  it("serves only configured sender countries", () => {
    process.env.SENDCLOUD_PUBLIC_KEY = "pub"
    process.env.SENDCLOUD_SECRET_KEY = "sec"
    process.env.SENDCLOUD_SENDER_COUNTRIES = "IT, de"
    expect(sendcloudServesSender("it")).toBe(true)
    expect(sendcloudServesSender("DE")).toBe(true)
    expect(sendcloudServesSender("EE")).toBe(false)
    delete process.env.SENDCLOUD_SECRET_KEY
    expect(sendcloudServesSender("IT")).toBe(false)
  })
})
