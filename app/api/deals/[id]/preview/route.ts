import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { getDealPreviewForInvite } from "@/lib/deals-access"

/**
 * Minimal deal info for the invite/join page — unlike GET /api/deals/[id], this doesn't require
 * the caller to already be a participant, since the whole point is deciding whether to join.
 * Still requires *a* logged-in user, matching every other /dashboard route.
 */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await context.params
  const preview = await getDealPreviewForInvite(id)
  if (!preview) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }
  const { creatorUserId, ...rest } = preview
  return NextResponse.json({ ...rest, isOwnDeal: creatorUserId === user.id })
}
