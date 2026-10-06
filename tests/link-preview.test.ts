import { describe, expect, it } from "vitest"
import { extractPreview, isPreviewableHost } from "@/lib/link-preview"

describe("isPreviewableHost", () => {
  it("allows known marketplaces and their subdomains", () => {
    expect(isPreviewableHost("es.wallapop.com")).toBe(true)
    expect(isPreviewableHost("www.ebay.de")).toBe(true)
  })

  it("rejects unknown, look-alike and internal hosts", () => {
    expect(isPreviewableHost("evilwallapop.com")).toBe(false)
    expect(isPreviewableHost("localhost")).toBe(false)
    expect(isPreviewableHost("169.254.169.254")).toBe(false)
    expect(isPreviewableHost("www.facebook.com")).toBe(false)
  })
})

describe("extractPreview", () => {
  it("prefers schema.org Product data", () => {
    const html = `<html><head>
      <meta property="og:title" content="Fallback title">
      <script type="application/ld+json">{"@type":"Product","name":"iPhone 15 &amp; case","image":["https://img/x.jpg"],
        "offers":{"price":"1.234,50","priceCurrency":"EUR"}}</script>
    </head></html>`
    expect(extractPreview(html)).toEqual({
      title: "iPhone 15 & case",
      description: null,
      imageUrl: "https://img/x.jpg",
      price: 1234.5,
      currency: "EUR",
    })
  })

  it("falls back to Open Graph meta tags in either attribute order", () => {
    const html = `<meta content="Bike" property="og:title"><meta property="og:image" content="https://img/b.png">
      <meta property="product:price:amount" content="80"><meta property="product:price:currency" content="EUR">`
    const preview = extractPreview(html)
    expect(preview.title).toBe("Bike")
    expect(preview.imageUrl).toBe("https://img/b.png")
    expect(preview.price).toBe(80)
    expect(preview.currency).toBe("EUR")
  })
})
