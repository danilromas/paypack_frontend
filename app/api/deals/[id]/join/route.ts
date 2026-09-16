import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth/session"
import { joinDealByLink, getDealForViewer } from "@/lib/deals-access"

/** The counterparty attaches themselves to a pending deal via its invite link. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const result = await db.transaction((tx) => joinDealByLink(tx, id, user.id))
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/join failed", error)
    return NextResponse.json({ error: "Failed to join deal" }, { status: 500 })
  }
}
