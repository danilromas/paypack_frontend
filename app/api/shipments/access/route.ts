import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { isBookingPasswordValid } from "@/lib/shipment-access"
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit"

/** Tells the wizard whether this account books without the password (shipper accounts). */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  return NextResponse.json({ granted: user.canBookShipments })
}

/** Lets the wizard reject a wrong booking password up front, before anyone fills in the whole form. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.canBookShipments) {
    return NextResponse.json({ ok: true })
  }

  // The shared password guards labels PayPack pays for — don't let anyone brute-force it.
  const limit = rateLimit(`booking-password:${user.id}:${clientIp(req)}`, 10, 15 * 60 * 1000)
  if (!limit.ok) return tooManyRequests(limit)

  const body = (await req.json().catch(() => ({}))) as { password?: unknown }
  if (!isBookingPasswordValid(body.password)) {
    return NextResponse.json({ error: "Wrong booking password" }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
