import { describe, expect, it } from "vitest"
import { pickTierQuotes, mapTrackingStatus, extractWebhookOrderCodes, toCreatedOrder } from "../lib/eurosender"
import {
  needsCustoms,
  normalizeCustomsDetails,
  normalizeShipmentAddress,
  validateCustomsDetails,
  validatePickupDate,
  validateShipmentAddress,
  validateShipmentCreatePayload,
} from "../lib/shipments"

const price = (gross: number) => ({ original: { currencyCode: "EUR", gross, net: gross / 1.24 } })

describe("pickTierQuotes", () => {
  it("only sells door-to-door and picks the cheapest option per tier", () => {
    const quotes = pickTierQuotes([
      { name: "selection", serviceSubtype: "door_to_door", edt: "3-4", price: price(23.19), minPickupDate: "2026-10-16T00:00:00+02:00", pickupExcludedDates: ["2026-10-17T00:00:00+02:00"] },
      { name: "regular_plus", serviceSubtype: "shop_to_shop", edt: "3", price: price(10) },
      { name: "regular_plus", serviceSubtype: "door_to_door", edt: "3", price: price(35) },
      { name: "regular_plus", serviceSubtype: "door_to_door", edt: "3", price: price(31.38) },
      { name: "express", serviceSubtype: "door_to_shop", edt: "1", price: price(90) },
    ])

    expect(quotes).toEqual([
      {
        tier: "economy",
        serviceType: "selection",
        priceGross: 23.19,
        currency: "EUR",
        estimatedDelivery: "3-4",
        minPickupDate: "2026-10-16",
        pickupExcludedDates: ["2026-10-17"],
      },
      {
        tier: "standard",
        serviceType: "regular_plus",
        priceGross: 31.38,
        currency: "EUR",
        estimatedDelivery: "3",
        minPickupDate: null,
        pickupExcludedDates: [],
      },
    ])
  })

  it("skips options without a price", () => {
    expect(pickTierQuotes([{ name: "express", serviceSubtype: "door_to_door" }])).toEqual([])
  })
})

describe("toCreatedOrder", () => {
  it("reads package tracking from the order payload's number/url fields", () => {
    expect(
      toCreatedOrder({
        orderCode: "260115-00012345",
        courier: { shortName: "DPD" },
        labelLink: "https://labels.example/1.pdf",
        price: { original: { gross: 23.19, currencyCode: "EUR" } },
        parcels: { packages: [{ tracking: { number: "0123456789", url: "https://track.example/0123456789" } }] },
      }),
    ).toEqual({
      orderCode: "260115-00012345",
      carrierName: "DPD",
      labelUrl: "https://labels.example/1.pdf",
      trackingNumber: "0123456789",
      trackingUrl: "https://track.example/0123456789",
      priceGross: 23.19,
      currency: "EUR",
    })
  })
})

describe("mapTrackingStatus", () => {
  it("collapses carrier states onto our timeline", () => {
    expect(mapTrackingStatus("Delivered")).toBe("arrived")
    expect(mapTrackingStatus("OutForDelivery")).toBe("in-transit")
    expect(mapTrackingStatus("InfoReceived")).toBe("pending")
    expect(mapTrackingStatus(null)).toBe("pending")
  })
})

describe("extractWebhookOrderCodes", () => {
  it("reads top-level and notification order codes, deduplicated", () => {
    expect(
      extractWebhookOrderCodes({ orderCode: "A-1", notifications: [{ orderCode: "A-1" }, { orderCode: "B-2" }, {}] }),
    ).toEqual(["A-1", "B-2"])
    expect(extractWebhookOrderCodes(null)).toEqual([])
  })
})

describe("validateShipmentAddress", () => {
  const address = { country: "ee", zip: "10111", city: "Tallinn", street: "Narva mnt 5", phone: "+372 5555 1234", email: "a@b.ee" }

  it("accepts a complete EU address", () => {
    expect(validateShipmentAddress(address, "sender")).toBeNull()
  })

  it("rejects countries outside the EU", () => {
    expect(validateShipmentAddress({ ...address, country: "GB" }, "receiver")).toMatch(/only ship within the EU/)
  })

  it("normalizes formatting carriers reject", () => {
    const normalized = normalizeShipmentAddress({ ...address, phone: " +372 (5555) 12-34 " })
    expect(normalized.phone).toBe("+37255551234")
    expect(normalized.country).toBe("EE")
  })

  it("rejects a malformed phone", () => {
    expect(validateShipmentAddress({ ...address, phone: "call me" }, "sender")).toBe("Invalid sender phone")
  })
})

describe("validatePickupDate", () => {
  const today = new Date("2026-10-15T10:00:00Z")

  it("accepts today and future days", () => {
    expect(validatePickupDate("2026-10-15", today)).toBeNull()
    expect(validatePickupDate("2026-10-20", today)).toBeNull()
  })

  it("rejects past, malformed and impossible dates", () => {
    expect(validatePickupDate("2026-10-14", today)).toBe("Pickup date is in the past")
    expect(validatePickupDate("16.10.2026", today)).toBe("Invalid pickup date")
    expect(validatePickupDate("2026-02-30", today)).toBe("Invalid pickup date")
  })
})

describe("shipping to Switzerland", () => {
  const it_ = { country: "IT", zip: "10035", city: "Mazzè", street: "Via del Ponticello 14", phone: "+393331234567", email: "a@b.it" }
  const ch = { country: "CH", zip: "8001", city: "Zürich", street: "Bahnhofstrasse 1", phone: "+41441234567", email: "c@d.ch" }
  const customs = { hsCode: "4202.21", originCountry: "it", quantity: 2, exportReason: "commercial_goods" as const }
  const payload = {
    senderName: "Seller",
    senderLocation: "x",
    receiverName: "Buyer",
    receiverLocation: "x",
    serviceTier: "standard" as const,
    weightKg: 3,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    senderAddress: it_,
    receiverAddress: ch,
    contents: "Leather handbags",
    declaredValueEur: 900,
    customs,
  }

  it("accepts Switzerland as a receiver but not as a sender", () => {
    expect(needsCustoms("ch")).toBe(true)
    expect(needsCustoms("IT")).toBe(false)
    expect(validateShipmentAddress(ch, "receiver")).toBeNull()
    expect(validateShipmentAddress(ch, "sender")).toMatch(/from inside the EU/)
  })

  it("requires customs details, contents and a value for Swiss receivers", () => {
    expect(validateShipmentCreatePayload(payload)).toBeNull()
    expect(validateShipmentCreatePayload({ ...payload, customs: null })).toMatch(/Customs details are required/)
    expect(validateShipmentCreatePayload({ ...payload, declaredValueEur: null })).toMatch(/value of the goods/)
    expect(validateShipmentCreatePayload({ ...payload, receiverAddress: it_, customs: null })).toBeNull()
  })

  it("validates and normalizes the customs fields", () => {
    expect(validateCustomsDetails({ ...customs, hsCode: "42" })).toMatch(/HS code/)
    expect(validateCustomsDetails({ ...customs, quantity: 0 })).toMatch(/number of items/)
    expect(validateCustomsDetails({ ...customs, exportReason: "smuggling" })).toMatch(/export reason/)
    expect(validateCustomsDetails({ ...customs, senderVatNumber: "12-345" })).toMatch(/VAT/)
    expect(normalizeCustomsDetails({ ...customs, senderVatNumber: "it 123 456 789 01" })).toEqual({
      hsCode: "420221",
      originCountry: "IT",
      quantity: 2,
      exportReason: "commercial_goods",
      senderVatNumber: "IT12345678901",
    })
  })
})
