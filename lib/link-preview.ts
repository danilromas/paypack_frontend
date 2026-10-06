import "server-only"

export interface LinkPreview {
  title: string | null
  description: string | null
  imageUrl: string | null
  price: number | null
  currency: string | null
}

/**
 * Marketplaces we unfurl server-side. An allowlist (rather than "any URL") keeps this from being
 * usable to make the server fetch arbitrary/internal hosts. Facebook is deliberately absent: it
 * serves a login wall to servers, so FB listings are imported by the browser extension instead.
 */
const ALLOWED_HOST_SUFFIXES = [
  "wallapop.com",
  "vinted.com", "vinted.es", "vinted.fr", "vinted.it", "vinted.de", "vinted.co.uk", "vinted.pl", "vinted.pt", "vinted.nl", "vinted.be",
  "ebay.com", "ebay.es", "ebay.fr", "ebay.it", "ebay.de", "ebay.co.uk",
  "subito.it", "milanuncios.com", "leboncoin.fr", "kleinanzeigen.de", "marktplaats.nl", "olx.pt", "olx.pl",
  "etsy.com", "depop.com",
]

const MAX_BYTES = 1_500_000
const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 3

export function isPreviewableHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .trim()
}

function readMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\:]/g, "\\$&")
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${escaped}["']`, "i"),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]?.trim()) return decodeEntities(m[1])
    }
  }
  return null
}

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null
  if (typeof raw !== "string") return null
  const cleaned = raw.replace(/[^\d.,]/g, "")
  if (!cleaned) return null
  // "1.234,56" / "1,234.56" / "1234,5" → treat the last separator followed by 1–2 digits as decimal.
  const m = cleaned.match(/^(.*?)[.,](\d{1,2})$/)
  const n = m ? Number(`${m[1].replace(/[.,]/g, "")}.${m[2]}`) : Number(cleaned.replace(/[.,]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Pulls name/price/image out of schema.org Product blocks, which many marketplaces embed. */
function readJsonLdProduct(html: string): Partial<LinkPreview> {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const block of blocks) {
    let data: unknown
    try {
      data = JSON.parse(block[1])
    } catch {
      continue
    }
    const queue: unknown[] = [data]
    while (queue.length) {
      const node = queue.shift()
      if (!node || typeof node !== "object") continue
      if (Array.isArray(node)) {
        queue.push(...node)
        continue
      }
      const obj = node as Record<string, unknown>
      if (obj["@graph"]) queue.push(obj["@graph"])
      const type = obj["@type"]
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"))
      if (!isProduct) continue
      const offers = (Array.isArray(obj.offers) ? obj.offers[0] : obj.offers) as Record<string, unknown> | undefined
      const image = Array.isArray(obj.image) ? obj.image[0] : obj.image
      return {
        title: typeof obj.name === "string" ? decodeEntities(obj.name) : null,
        description: typeof obj.description === "string" ? decodeEntities(obj.description) : null,
        imageUrl: typeof image === "string" ? image : null,
        price: parsePrice(offers?.price ?? offers?.lowPrice),
        currency: typeof offers?.priceCurrency === "string" ? offers.priceCurrency : null,
      }
    }
  }
  return {}
}

export function extractPreview(html: string): LinkPreview {
  const ld = readJsonLdProduct(html)
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
  return {
    title: ld.title ?? readMeta(html, ["og:title", "twitter:title"]) ?? (titleTag ? decodeEntities(titleTag) : null),
    description: ld.description ?? readMeta(html, ["og:description", "twitter:description", "description"]),
    imageUrl: ld.imageUrl ?? readMeta(html, ["og:image", "og:image:url", "twitter:image"]),
    price:
      ld.price ??
      parsePrice(readMeta(html, ["product:price:amount", "og:price:amount", "price"])),
    currency: ld.currency ?? readMeta(html, ["product:price:currency", "og:price:currency", "priceCurrency"]),
  }
}

export class LinkPreviewError extends Error {}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new LinkPreviewError("That doesn't look like a valid link")
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new LinkPreviewError("Unsupported link")
    if (!isPreviewableHost(url.hostname)) throw new LinkPreviewError("We can't read details from this site automatically")

    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "PayPackLinkPreview/1.0 (+https://paypack.uno)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en;q=0.9,es;q=0.8,it;q=0.7",
      },
    })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location")
      if (!location) break
      url = new URL(location, url)
      continue
    }
    if (!res.ok) throw new LinkPreviewError("The listing page couldn't be loaded")

    const reader = res.body?.getReader()
    if (!reader) throw new LinkPreviewError("The listing page couldn't be loaded")
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.byteLength
    }
    reader.cancel().catch(() => {})
    const html = new TextDecoder().decode(Buffer.concat(chunks))
    const preview = extractPreview(html)
    if (preview.imageUrl) {
      try {
        preview.imageUrl = new URL(preview.imageUrl, url).toString()
      } catch {
        preview.imageUrl = null
      }
    }
    return preview
  }

  throw new LinkPreviewError("The listing page couldn't be loaded")
}
