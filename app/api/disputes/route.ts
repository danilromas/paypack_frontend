import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { listDisputesForUser } from "@/lib/disputes"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const disputes = await listDisputesForUser(user.id)
    return NextResponse.json(disputes)
  } catch (error) {
    console.error("GET /api/disputes failed", error)
    return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 })
  }
}
