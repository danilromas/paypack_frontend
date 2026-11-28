import { describe, expect, it } from "vitest"
import {
  BUYER_PROTECTION_DAYS,
  nextStepFor,
  parseDeliveryAddress,
  releaseAvailableAt,
  trackingUrlFor,
  validateDeliveryAddress,
} from "../lib/deals"
import { isNavItemActive, normalizePath, sectionForPath } from "../components/dashboard/section-switcher"

const address = { name: "Ann Rossi", street: "Via Roma 12", city: "Torino", postcode: "10121", country: "it", phone: "+39 333 1234567" }

describe("delivery address", () => {
  it("accepts a complete address and upper-cases the country", () => {
    const parsed = parseDeliveryAddress(address)
    expect(parsed?.country).toBe("IT")
    expect(validateDeliveryAddress(parsed)).toBeNull()
  })

  it("requires street, city, postcode and a country code", () => {
    expect(validateDeliveryAddress(parseDeliveryAddress({ ...address, street: " " }))).toMatch(/street/i)
    expect(validateDeliveryAddress(parseDeliveryAddress({ ...address, city: "" }))).toMatch(/city/i)
    expect(validateDeliveryAddress(parseDeliveryAddress({ ...address, postcode: "" }))).toMatch(/postcode/i)
    expect(validateDeliveryAddress(parseDeliveryAddress({ ...address, country: "Italy" }))).toMatch(/country/i)
    expect(validateDeliveryAddress(parseDeliveryAddress(null))).toBeTruthy()
  })

  it("rejects Cyrillic, since carriers print Latin labels", () => {
    expect(validateDeliveryAddress(parseDeliveryAddress({ ...address, city: "Москва" }))).toBeTruthy()
  })

  it("rejects a phone with letters", () => {
    expect(validateDeliveryAddress(parseDeliveryAddress({ ...address, phone: "call me" }))).toMatch(/phone/i)
  })
})

describe("tracking links", () => {
  it("builds the carrier's tracking page", () => {
    expect(trackingUrlFor("DHL", "JD0146")).toContain("JD0146")
    expect(trackingUrlFor("dhl", "JD0146")).toContain("dhl.com")
  })

  it("returns null for unknown carriers or missing numbers", () => {
    expect(trackingUrlFor("Other", "123")).toBeNull()
    expect(trackingUrlFor("Pigeon Post", "123")).toBeNull()
    expect(trackingUrlFor("DHL", "")).toBeNull()
  })

  it("encodes the tracking number", () => {
    expect(trackingUrlFor("UPS", "1Z 99/<x>")).not.toContain("<x>")
  })
})

describe("buyer protection", () => {
  it("opens release exactly BUYER_PROTECTION_DAYS after shipping", () => {
    const shipped = new Date("2026-11-01T10:00:00Z")
    const at = releaseAvailableAt(shipped)!
    expect(at.getTime() - shipped.getTime()).toBe(BUYER_PROTECTION_DAYS * 24 * 60 * 60 * 1000)
    expect(releaseAvailableAt(undefined)).toBeNull()
  })
})

describe("nextStepFor", () => {
  const base = { counterpartyJoined: true, hasRated: false }

  it("asks the buyer to pay only once the seller joined", () => {
    expect(nextStepFor({ ...base, status: "pending", myRole: "buyer" })).toEqual({ mine: true, label: "Pay into escrow" })
    expect(nextStepFor({ ...base, counterpartyJoined: false, status: "pending", myRole: "buyer" })?.mine).toBe(false)
  })

  it("asks the seller to ship a paid deal", () => {
    expect(nextStepFor({ ...base, status: "escrow", myRole: "seller" })).toEqual({ mine: true, label: "Ship the item" })
    expect(nextStepFor({ ...base, status: "escrow", myRole: "buyer" })?.mine).toBe(false)
  })

  it("lets the seller release only after buyer protection", () => {
    const shippedAt = "2026-11-01T00:00:00Z"
    const during = new Date("2026-11-05T00:00:00Z")
    const after = new Date("2026-11-20T00:00:00Z")
    expect(nextStepFor({ ...base, status: "shipped", myRole: "seller", shippedAt }, during)?.mine).toBe(false)
    expect(nextStepFor({ ...base, status: "shipped", myRole: "seller", shippedAt }, after)).toEqual({
      mine: true,
      label: "Release the payment",
    })
  })

  it("prompts for a rating after completion, then nothing", () => {
    expect(nextStepFor({ ...base, status: "completed", myRole: "buyer" })?.label).toMatch(/rate/i)
    expect(nextStepFor({ ...base, hasRated: true, status: "completed", myRole: "buyer" })).toBeNull()
  })
})

describe("sidebar section detection (trailingSlash: true)", () => {
  it("treats /dashboard/ and /dashboard as the Deal section", () => {
    expect(sectionForPath("/dashboard/")).toBe("deal")
    expect(sectionForPath("/dashboard")).toBe("deal")
    expect(sectionForPath("/dashboard/deals/join/abc/")).toBe("deal")
  })

  it("detects Shipments with or without the slash, and shared pages as neither", () => {
    expect(sectionForPath("/dashboard/shipments/")).toBe("ship")
    expect(sectionForPath("/dashboard/wallet/")).toBeNull()
  })

  it("highlights menu items regardless of the trailing slash", () => {
    expect(isNavItemActive("/dashboard", "/dashboard/")).toBe(true)
    expect(isNavItemActive("/dashboard/wallet", "/dashboard/wallet/")).toBe(true)
    expect(isNavItemActive("/dashboard/chats", "/dashboard/chatsx/")).toBe(false)
    expect(normalizePath("/")).toBe("/")
  })
})
