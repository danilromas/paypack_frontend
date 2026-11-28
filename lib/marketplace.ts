export type MarketplacePlatform = "facebook_marketplace"

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "web.facebook.com",
  "m.facebook.com",
])

export function detectMarketplacePlatform(
  url: string | null | undefined,
): MarketplacePlatform | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!FACEBOOK_HOSTS.has(parsed.hostname.toLowerCase())) return null
  // The Facebook app's "Share" button copies a short /share/<token>/ link that redirects to the listing.
  // Posts, videos and reels share as /share/p|v|r/…, so only the bare token form counts.
  const isShareLink = /^\/share\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname)
  if (!parsed.pathname.includes("/marketplace/") && !isShareLink) return null
  return "facebook_marketplace"
}

export function buildDefaultSellerMessage(
  dealTitle: string,
  confirmUrl: string,
): string {
  const title = dealTitle.trim() || "this item"
  return `Hi! I'd like to buy "${title}" through PayPack for secure escrow protection. I've created the deal — please confirm here: ${confirmUrl}`
}

export function buildSellerMessageUrl(
  sourceUrl: string,
  dealId: string,
  message: string,
): string {
  const u = new URL(sourceUrl)
  u.searchParams.set("pp_msg", message)
  u.searchParams.set("pp_deal", dealId)
  return u.toString()
}
