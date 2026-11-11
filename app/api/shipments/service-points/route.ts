import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { SendcloudError, findServicePoints, isSendcloudEnabled } from "@/lib/sendcloud"

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
  if (!/^[a-z0-9_]{2,40}$/.test(carrier) || !/^[A-Za-z]{2}$/.test(country) || !zip || !city) {
    return NextResponse.json({ error: "Carrier, country, postal code and city are required" }, { status: 400 })
  }

  try {
    const points = await findServicePoints({ country, zip, city, street: q.get("street")?.trim() || undefined }, carrier)
    return NextResponse.json({ points })
  } catch (error) {
    if (error instanceof SendcloudError) {
      return NextResponse.json({ error: error.message }, { status: error.status >= 500 ? 502 : 400 })
    }
    console.error("GET /api/shipments/service-points failed", error)
    return NextResponse.json({ error: "Failed to find pickup points" }, { status: 500 })
  }
}
