import { beforeEach, describe, expect, it } from "vitest"
import { rateLimit, resetRateLimits } from "../lib/rate-limit"
import { isUuid } from "../lib/ids"
import { isUniqueViolation } from "../lib/db-errors"
import { MAX_DEAL_AMOUNT, isSafeHttpUrl, validateDealCreatePayload } from "../lib/deals"

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits())

  it("allows up to the limit inside a window, then blocks", () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000, now).ok).toBe(true)
    const blocked = rateLimit("k", 3, 60_000, now + 1000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(59)
  })

  it("starts a fresh window once the old one expires, and keys are independent", () => {
    for (let i = 0; i < 4; i++) rateLimit("a", 3, 60_000, 0)
    expect(rateLimit("a", 3, 60_000, 60_000).ok).toBe(true)
    expect(rateLimit("b", 3, 60_000, 0).ok).toBe(true)
  })
})

describe("isUuid", () => {
  it("accepts canonical UUIDs only", () => {
    expect(isUuid("3f2b8c1e-9a4d-4c3b-8e2f-1a2b3c4d5e6f")).toBe(true)
    expect(isUuid("abc")).toBe(false)
    expect(isUuid("3f2b8c1e-9a4d-4c3b-8e2f-1a2b3c4d5e6f; drop table")).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})

describe("isUniqueViolation", () => {
  it("finds code 23505 directly or in a wrapped cause", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true)
    expect(isUniqueViolation({ message: "x", cause: { code: "23505" } })).toBe(true)
    expect(isUniqueViolation({ code: "23503" })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })
})

describe("deal validation", () => {
  const base = {
    title: "Bike",
    description: "",
    price: 100,
    shippingPrice: 10,
    currency: "EUR",
    role: "seller" as const,
    counterparty: "",
  }

  it("accepts a normal deal", () => {
    expect(validateDealCreatePayload(base)).toBeNull()
  })

  it("rejects unknown currencies, zero/huge prices and long titles", () => {
    expect(validateDealCreatePayload({ ...base, currency: "XYZ" })).toBe("Unsupported currency")
    expect(validateDealCreatePayload({ ...base, price: 0 })).toBe("Invalid price")
    expect(validateDealCreatePayload({ ...base, price: MAX_DEAL_AMOUNT + 1 })).toBe("Invalid price")
    expect(validateDealCreatePayload({ ...base, shippingPrice: -1 })).toBe("Invalid shippingPrice")
    expect(validateDealCreatePayload({ ...base, title: "x".repeat(201) })).toMatch(/too long/)
  })

  it("only stores http(s) links", () => {
    expect(isSafeHttpUrl("https://example.com/a.jpg")).toBe(true)
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isSafeHttpUrl("data:image/png;base64,AAAA")).toBe(false)
    expect(validateDealCreatePayload({ ...base, imageUrl: "javascript:alert(1)" })).toBe("Invalid imageUrl")
  })
})
