import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { listVerificationQueue } from "@/lib/kyc"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const queue = await listVerificationQueue()
    return NextResponse.json(queue)
  } catch (error) {
    console.error("GET /api/admin/verification failed", error)
    return NextResponse.json({ error: "Failed to fetch verification queue" }, { status: 500 })
  }
}
