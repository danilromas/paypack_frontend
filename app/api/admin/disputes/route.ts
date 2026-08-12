import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { listDisputesForAdmin } from "@/lib/disputes"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const disputes = await listDisputesForAdmin()
    return NextResponse.json(disputes)
  } catch (error) {
    console.error("GET /api/admin/disputes failed", error)
    return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 })
  }
}
