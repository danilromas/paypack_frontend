import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { getPublicProfile } from "@/lib/ratings"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    // Any signed-in user may view a public profile (per client request: users must be able to find
    // each other). The DTO only carries name/avatar/KYC/rating/deal count — never email or phone.
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
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
