import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole } from "@/lib/deals-access"
import { listDealEvents } from "@/lib/deal-events"

/** The deal's timeline for one of its participants. */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const role = await getParticipantRole(id, user.id)
    if (!role) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }
    return NextResponse.json(await listDealEvents(id))
  } catch (error) {
    console.error("GET /api/deals/[id]/events failed", error)
    return NextResponse.json({ error: "Failed to load the deal history" }, { status: 500 })
  }
}
