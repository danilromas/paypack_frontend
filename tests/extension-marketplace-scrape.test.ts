import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = path.dirname(fileURLToPath(import.meta.url))
const div2Html = readFileSync(
  path.join(root, "../market/div2/(8) Facebook Marketplace _ Facebook.html"),
  "utf-8",
)

function parseMoneyToInt(raw: string) {
  if (!raw) return 0
  let s = String(raw).replace(/[\s\u00A0]/g, "").trim()
  const decComma = /^(\d{1,3}(?:[.,]\d{3})*),(\d{1,2})$/
  const decDot = /^(\d{1,3}(?:[.,]\d{3})*)\.(\d{1,2})$/
  let m = s.match(decComma)
  if (m) {
    const intPart = m[1].replace(/[.,]/g, "")
    return Math.round(parseFloat(intPart + "." + m[2]))
  }
  m = s.match(decDot)
  if (m && m[2].length <= 2) {
    const intPart = m[1].replace(/,/g, "")
    return Math.round(parseFloat(intPart + "." + m[2]))
  }
  s = s.replace(/[.,](?=\d{3}\b)/g, "")
  s = s.replace(",", ".").replace(/[^\d.]/g, "")
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function extractListingPriceFromText(headerText: string) {
  const patterns: Array<[RegExp, number]> = [
    [/(\d[\d\s\u00A0.,]*)\s*(?:€|EUR|eur)(?=\s|$|[^\w])/gi, 1],
    [/(?:€|EUR|eur)\s*(\d[\d\s\u00A0.,]*)/gi, 1],
  ]
  for (const [re, g] of patterns) {
    re.lastIndex = 0
    const m = re.exec(headerText)
    if (m && m[g]) {
      const n = parseMoneyToInt(m[g])
      if (n > 0 && n < 1e10) return n
    }
  }
  return 0
}

describe("Italian marketplace snapshot (market/div2)", () => {
  it("parses euro prices written as amount then symbol", () => {
    expect(extractListingPriceFromText("3000 €")).toBe(3000)
    expect(extractListingPriceFromText("12.000 €")).toBe(12000)
  })

  it("exposes listing title and price in aria-label and embedded JSON", () => {
    const aria = div2Html.match(
      /aria-label="([^"]+annuncio\s+\d+[^"]*)"/i,
    )?.[1]
    expect(aria).toBeTruthy()
    expect(aria).toMatch(/Mercedes-Benz/i)
    expect(extractListingPriceFromText(aria || "")).toBe(3000)

    expect(div2Html).toContain("marketplace_listing_title")
    expect(div2Html).toContain("redacted_description")
    expect(div2Html).toContain('"amount":"12000.00"')
  })
})
