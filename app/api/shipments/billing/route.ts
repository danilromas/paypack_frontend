import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { getShipperBalance } from "@/lib/shipment-billing"

/** A shipper account's own label bill: unbilled, invoiced (due) and paid totals per currency. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    return NextResponse.json({ canBookShipments: user.canBookShipments, ...(await getShipperBalance(user.id)) })
  } catch (error) {
    console.error("GET /api/shipments/billing failed", error)
    return NextResponse.json({ error: "Failed to load billing" }, { status: 500 })
  }
}
