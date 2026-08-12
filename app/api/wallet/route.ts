import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { getWalletSummary } from "@/lib/wallet"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const summary = await getWalletSummary(user.id)
    return NextResponse.json(summary)
  } catch (error) {
    console.error("GET /api/wallet failed", error)
    return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 })
  }
}
