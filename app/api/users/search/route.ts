import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { searchUsers } from "@/lib/deals-access"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100)
    const results = await searchUsers(user.id, q)
    return NextResponse.json(results)
  } catch (error) {
    console.error("GET /api/users/search failed", error)
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
  }
}
