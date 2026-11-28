/**
 * Postcode → place lookups for the shipment wizard. Carriers only check a postcode's *format*; a
 * well-formed but non-existent postcode (or a city that doesn't belong to it) slips through and then
 * the locker search finds nothing. We check against the public GeoNames postcode data (served by
 * zippopotam.us) where it has the country.
 *
 * The data has gaps (a few real postcodes are missing), so an unknown postcode is a warning, never a
 * hard block.
 */

export interface PostcodePlace {
  city: string
  region: string | null
}

export type PostcodeLookup =
  | { status: "found"; places: PostcodePlace[] }
  /** The country is covered but this postcode isn't in it — most likely a typo. */
  | { status: "unknown" }
  /** Country not covered, or the lookup service didn't answer — we can't say either way. */
  | { status: "unchecked" }

/** Countries we ship to that the lookup covers, with each one's postcode spelling there. */
const FORMATS: Record<string, (zip: string) => string | null> = {
  AT: digits(4),
  BE: digits(4),
  BG: digits(4),
  CH: digits(4),
  DE: digits(5),
  DK: digits(4),
  ES: digits(5),
  FI: digits(5),
  FR: digits(5),
  HR: digits(5),
  HU: digits(4),
  IT: digits(5),
  LI: digits(4),
  LT: (z) => (/^(LT-?)?\d{5}$/i.test(z) ? z.replace(/^LT-?/i, "") : null),
  LU: (z) => (/^(L-?)?\d{4}$/i.test(z) ? `L-${z.replace(/^L-?/i, "")}` : null),
  MC: digits(5),
  // GeoNames keys Dutch postcodes on the four digits only ("1012", not "1012 AB").
  NL: (z) => z.match(/^(\d{4})\s?[A-Z]{0,2}$/i)?.[1] ?? null,
  PL: (z) => (/^\d{2}-?\d{3}$/.test(z) ? `${z.slice(0, 2)}-${z.slice(-3)}` : null),
  PT: (z) => (/^\d{4}-?\d{3}$/.test(z) ? `${z.slice(0, 4)}-${z.slice(-3)}` : null),
  SE: (z) => (/^\d{3}\s?\d{2}$/.test(z) ? z.replace(/\s/g, "") : null),
  SI: digits(4),
  SK: (z) => (/^\d{3}\s?\d{2}$/.test(z) ? `${z.replace(/\s/g, "").slice(0, 3)} ${z.slice(-2)}` : null),
  SM: digits(5),
  CZ: (z) => (/^\d{3}\s?\d{2}$/.test(z) ? `${z.replace(/\s/g, "").slice(0, 3)} ${z.slice(-2)}` : null),
  US: (z) => z.match(/^(\d{5})(-\d{4})?$/)?.[1] ?? null,
  VA: digits(5),
}

function digits(n: number) {
  const re = new RegExp(`^\\d{${n}}$`)
  return (z: string) => (re.test(z) ? z : null)
}

/** The country + postcode key the lookup service understands, or null when we can't check it. */
export function postcodeLookupKey(country: string, zip: string): { country: string; zip: string } | null {
  const c = country.trim().toUpperCase()
  const format = FORMATS[c]
  const value = zip.trim().toUpperCase()
  if (!format || !value) return null
  const normalized = format(value)
  return normalized ? { country: c, zip: normalized } : null
}

/** GeoNames spells Italian accents as apostrophes ("Mazze'"); people write "Mazzè". */
function prettyCity(name: string, country: string): string {
  const trimmed = name.trim()
  if (country !== "IT") return trimmed
  const accents: Record<string, string> = { a: "à", e: "è", i: "ì", o: "ò", u: "ù" }
  return trimmed.replace(/([aeiou])'(?=\s|$)/gi, (_, v: string) => {
    const accented = accents[v.toLowerCase()]
    return v === v.toUpperCase() ? accented.toUpperCase() : accented
  })
}

/** Reads a zippopotam.us response body into our places, de-duplicated, in the service's order. */
export function parsePostcodePlaces(body: unknown, country: string): PostcodePlace[] {
  const places = (body as { places?: unknown })?.places
  if (!Array.isArray(places)) return []
  const seen = new Set<string>()
  const out: PostcodePlace[] = []
  for (const p of places) {
    const raw = (p as Record<string, unknown>)?.["place name"]
    if (typeof raw !== "string" || !raw.trim()) continue
    const city = prettyCity(raw, country.toUpperCase())
    const key = foldCity(city)
    if (seen.has(key)) continue
    seen.add(key)
    const region = (p as Record<string, unknown>)?.state
    out.push({ city, region: typeof region === "string" && region.trim() ? region.trim() : null })
  }
  return out
}

/**
 * Whether the first place is a city worth typing for the user. Dutch postcodes map to neighbourhoods
 * ("Amsterdam Binnenstad en Oostelijk Havengebied"), fine for checking a city but not for filling one in.
 */
export function canAutofillCity(country: string): boolean {
  return country.trim().toUpperCase() !== "NL"
}

/** Lower-case, accents and punctuation dropped: "Mazzè", "MAZZE'" and "mazze" compare equal. */
export function foldCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

/**
 * Whether a typed city plausibly belongs to the postcode. Lenient on purpose: "Tonengo di Mazzè"
 * and "Mazzè" both pass for 10035, as do "Frankfurt" and "Frankfurt am Main".
 */
export function cityMatchesPlaces(city: string, places: PostcodePlace[]): boolean {
  const typed = foldCity(city)
  if (!typed || places.length === 0) return true
  return places.some((p) => {
    const known = foldCity(p.city)
    return known === typed || (typed.length >= 3 && known.includes(typed)) || (known.length >= 3 && typed.includes(known))
  })
}
