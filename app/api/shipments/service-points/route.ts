import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { SendcloudError, findServicePoints, isSendcloudEnabled } from "@/lib/sendcloud"
import { postcodeError } from "@/lib/shipments"

/**
 * Lockers and pickup points of one carrier near the receiver, for the wizard's pickup point step:
 * /api/shipments/service-points/?carrier=inpost_it&country=IT&zip=20121&city=Milano&street=Via%20Brera%2010
 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!isSendcloudEnabled()) {
    return NextResponse.json({ error: "Pickup points aren't available" }, { status: 503 })
  }

  const q = new URL(req.url).searchParams
  const carrier = q.get("carrier")?.trim() ?? ""
  const country = q.get("country")?.trim() ?? ""
  const zip = q.get("zip")?.trim() ?? ""
  const city = q.get("city")?.trim() ?? ""
  if (!/^[a-z0-9_]{2,40}$/.test(carrier) || !/^[A-Za-z]{2}$/.test(country) || !zip) {
    return NextResponse.json({ error: "Carrier, country and postal code are required" }, { status: 400 })
  }
  const zipError = postcodeError(country, zip)
  if (zipError) {
    return NextResponse.json({ error: `The receiver's postcode looks wrong. ${zipError}` }, { status: 400 })
  }

  try {
    const street = q.get("street")?.trim() || undefined
    // A misspelt street or city makes the carrier find nothing (or reject the search). Fall back to the
    // postcode alone, which is what decides the neighbourhood anyway.
    let points = await findServicePoints({ country, zip, city: city || undefined, street }, carrier).catch((error) => {
      if (error instanceof SendcloudError && error.status < 500) return []
      throw error
    })
    if (points.length === 0 && (city || street)) {
      points = await findServicePoints({ country, zip }, carrier)
    }
    return NextResponse.json({ points })
  } catch (error) {
    if (error instanceof SendcloudError) {
      return NextResponse.json({ error: error.message }, { status: error.status >= 500 ? 502 : 400 })
    }
    console.error("GET /api/shipments/service-points failed", error)
    return NextResponse.json({ error: "Failed to find pickup points" }, { status: 500 })
  }
}
