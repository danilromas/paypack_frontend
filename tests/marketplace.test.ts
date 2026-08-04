import { describe, expect, it } from "vitest"
import {
  detectMarketplacePlatform,
  buildDefaultSellerMessage,
  buildSellerMessageUrl,
} from "../lib/marketplace"

describe("detectMarketplacePlatform", () => {
  it("recognizes Facebook Marketplace listing links", () => {
    expect(
      detectMarketplacePlatform("https://www.facebook.com/marketplace/item/123456789/"),
    ).toBe("facebook_marketplace")
    expect(
      detectMarketplacePlatform("https://m.facebook.com/marketplace/item/123/"),
    ).toBe("facebook_marketplace")
    expect(
      detectMarketplacePlatform("https://web.facebook.com/marketplace/category/electronics"),
    ).toBe("facebook_marketplace")
  })

  it("returns null for non-marketplace facebook links", () => {
    expect(detectMarketplacePlatform("https://www.facebook.com/someuser")).toBeNull()
  })

  it("returns null for other hosts", () => {
    expect(
      detectMarketplacePlatform("https://www.avito.ru/marketplace/item/1"),
    ).toBeNull()
  })

  it("returns null for empty or invalid input", () => {
    expect(detectMarketplacePlatform("")).toBeNull()
    expect(detectMarketplacePlatform(null)).toBeNull()
    expect(detectMarketplacePlatform(undefined)).toBeNull()
    expect(detectMarketplacePlatform("not a url")).toBeNull()
  })
})

describe("buildDefaultSellerMessage", () => {
  it("includes the deal title and confirm url", () => {
    const msg = buildDefaultSellerMessage("iPhone 15", "https://paypack.uno/dashboard/deals/confirm?payload=abc")
    expect(msg).toContain("iPhone 15")
    expect(msg).toContain("https://paypack.uno/dashboard/deals/confirm?payload=abc")
  })

  it("falls back to a generic label when title is blank", () => {
    const msg = buildDefaultSellerMessage("   ", "https://paypack.uno/x")
    expect(msg).toContain("this item")
  })
})

describe("buildSellerMessageUrl", () => {
  it("appends pp_msg and pp_deal params", () => {
    const url = buildSellerMessageUrl(
      "https://www.facebook.com/marketplace/item/123/",
      "deal-1",
      "Hello seller",
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get("pp_msg")).toBe("Hello seller")
    expect(parsed.searchParams.get("pp_deal")).toBe("deal-1")
    expect(parsed.origin + parsed.pathname).toBe(
      "https://www.facebook.com/marketplace/item/123/",
    )
  })

  it("preserves existing query params on the source url", () => {
    const url = buildSellerMessageUrl(
      "https://www.facebook.com/marketplace/item/123/?ref=abc",
      "deal-2",
      "Hi",
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get("ref")).toBe("abc")
    expect(parsed.searchParams.get("pp_deal")).toBe("deal-2")
  })
})
