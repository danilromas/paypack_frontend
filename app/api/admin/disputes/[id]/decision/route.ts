import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { disputes, disputeEvents, deals } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { notifyUser } from "@/lib/notifications"

const ACTIONS = ["needs-info", "resolved"] as const

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = (await req.json()) as { action?: unknown }
    const action = body.action as (typeof ACTIONS)[number]
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .update(disputes)
        .set({ status: action, resolvedAt: action === "resolved" ? new Date() : null })
        .where(eq(disputes.id, id))
        .returning()
      const dispute = rows[0]
      if (!dispute) return null

      const eventText =
        action === "resolved" ? "Admin approved and resolved the dispute" : "Admin requested more information"
      await tx.insert(disputeEvents).values({ disputeId: dispute.id, actorUserId: user.id, text: eventText })

      const dealRows = await tx.select({ title: deals.title }).from(deals).where(eq(deals.id, dispute.dealId)).limit(1)
      const dealTitle = dealRows[0]?.title ?? "your deal"

      await notifyUser(tx, {
        userId: dispute.openedByUserId,
        type: "deal",
        title: action === "resolved" ? `Dispute resolved for "${dealTitle}"` : `More info needed for "${dealTitle}"`,
        description: eventText,
        relatedHref: "/dashboard/",
      })

      return dispute
    })

    if (!result) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 })
    }

    return NextResponse.json({ id: result.id, status: result.status })
  } catch (error) {
    console.error("POST /api/admin/disputes/[id]/decision failed", error)
    return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 })
  }
}
