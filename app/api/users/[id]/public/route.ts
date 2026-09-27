import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { canViewUserProfile } from "@/lib/deals-access"
import { getPublicProfile } from "@/lib/ratings"

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const allowed = await canViewUserProfile(user.id, id)
    if (!allowed) {
      return NextResponse.json(
        { error: "You can only view profiles of people you've done a deal with" },
        { status: 403 },
      )
    }

    const profile = await getPublicProfile(id)
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("GET /api/users/[id]/public failed", error)
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
  }
}
