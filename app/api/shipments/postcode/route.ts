import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { parsePostcodePlaces, postcodeLookupKey, type PostcodeLookup } from "@/lib/postcode-places"
import { postcodeError } from "@/lib/shipments"

const LOOKUP_TIMEOUT_MS = 4000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX = 5000

// Postcodes don't move; one answer per instance per day is plenty.
const cache = new Map<string, { at: number; result: PostcodeLookup }>()

function remember(key: string, result: PostcodeLookup) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, { at: Date.now(), result })
}

/**
 * Which places a postcode belongs to, for the wizard to fill in the city and flag typos before the
 * carrier (or the locker search) trips over them: /api/shipments/postcode?country=IT&zip=10035
 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const q = new URL(req.url).searchParams
  const country = q.get("country")?.trim() ?? ""
  const zip = q.get("zip")?.trim() ?? ""
  if (!/^[A-Za-z]{2}$/.test(country) || !zip || zip.length > 12 || postcodeError(country, zip)) {
    return NextResponse.json({ status: "unchecked" } satisfies PostcodeLookup)
  }

  const key = postcodeLookupKey(country, zip)
  if (!key) return NextResponse.json({ status: "unchecked" } satisfies PostcodeLookup)

  const cacheKey = `${key.country}:${key.zip}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return NextResponse.json(hit.result)

  let result: PostcodeLookup
  try {
    const res = await fetch(
      `https://api.zippopotam.us/${key.country.toLowerCase()}/${encodeURIComponent(key.zip)}`,
      { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS), headers: { Accept: "application/json" } },
    )
    if (res.status === 404) {
      result = { status: "unknown" }
    } else if (!res.ok) {
      return NextResponse.json({ status: "unchecked" } satisfies PostcodeLookup)
    } else {
      const places = parsePostcodePlaces(await res.json(), key.country)
      result = places.length ? { status: "found", places } : { status: "unknown" }
    }
  } catch {
    // Lookup down or slow: say nothing rather than block a booking on someone else's outage.
    return NextResponse.json({ status: "unchecked" } satisfies PostcodeLookup)
  }

  remember(cacheKey, result)
  return NextResponse.json(result)
}
