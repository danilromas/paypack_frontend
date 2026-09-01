import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { disputes, disputeEvents, deals } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"
import { validateDisputeMessage } from "@/lib/disputes"

/** Lets a deal participant reply on their own open (or needs-info) dispute. A reply while
 * "needs-info" is treated as the requested information having arrived, so it flips back to "open"
 * for the admin to review — the only status transition a non-admin reply can cause. */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const body = (await req.json()) as { text?: unknown }
    const text = typeof body.text === "string" ? body.text.trim() : ""
    const validationError = validateDisputeMessage(text)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const result = await db.transaction(async (tx) => {
      const rows = await tx.select().from(disputes).where(eq(disputes.id, id)).limit(1)
      const dispute = rows[0]
      if (!dispute) return null

      const role = await getParticipantRole(dispute.dealId, user.id)
      if (!role) return "forbidden" as const

      if (dispute.status === "resolved") return "closed" as const

      await tx.insert(disputeEvents).values({ disputeId: dispute.id, actorUserId: user.id, text })

      if (dispute.status === "needs-info") {
        await tx.update(disputes).set({ status: "open" }).where(eq(disputes.id, dispute.id))
      }

      const dealRows = await tx.select({ title: deals.title }).from(deals).where(eq(deals.id, dispute.dealId)).limit(1)
      const dealTitle = dealRows[0]?.title ?? "your deal"

      await notifyOtherParticipants(tx, dispute.dealId, user.id, {
        type: "deal",
        title: `New reply on the dispute for "${dealTitle}"`,
        description: text,
        relatedHref: "/dashboard/support/",
      })

      return dispute
    })

    if (result === null) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 })
    }
    if (result === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (result === "closed") {
      return NextResponse.json({ error: "This dispute is closed" }, { status: 409 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/disputes/[id]/messages failed", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
