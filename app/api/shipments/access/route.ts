import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { isBookingPasswordValid } from "@/lib/shipment-access"

/** Lets the wizard reject a wrong booking password up front, before anyone fills in the whole form. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { password?: unknown }
  if (!isBookingPasswordValid(body.password)) {
    return NextResponse.json({ error: "Wrong booking password" }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
