import { NextResponse } from "next/server"
import { and, eq, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, disputes, disputeEvents } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getDealForViewer } from "@/lib/deals-access"
import { notifyOtherParticipants } from "@/lib/notifications"
import { validateReason } from "@/lib/disputes"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const role = await getParticipantRole(id, user.id)
    if (!role) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const body = (await req.json()) as { reason?: unknown }
    const reason = typeof body.reason === "string" ? body.reason.trim() : ""
    const validationError = validateReason(reason)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const result = await db.transaction(async (tx) => {
      const dealRows = await tx.select().from(deals).where(eq(deals.id, id)).limit(1)
      const deal = dealRows[0]
      if (!deal) return null
      if (deal.status === "pending" || deal.status === "cancelled" || deal.status === "completed") {
        return "not-disputable" as const
      }

      const openRows = await tx
        .select({ id: disputes.id })
        .from(disputes)
        .where(and(eq(disputes.dealId, deal.id), ne(disputes.status, "resolved")))
        .limit(1)
      if (openRows[0]) {
        return "already-open" as const
      }

      const inserted = await tx
        .insert(disputes)
        .values({ dealId: deal.id, openedByUserId: user.id, status: "open", reason })
        .returning()
      const dispute = inserted[0]

      await tx.insert(disputeEvents).values({
        disputeId: dispute.id,
        actorUserId: user.id,
        text: `Dispute opened: ${reason}`,
      })

      await tx.update(deals).set({ status: "disputed", updatedAt: new Date() }).where(eq(deals.id, deal.id))

      await notifyOtherParticipants(tx, deal.id, user.id, {
        type: "deal",
        title: `Dispute opened for "${deal.title}"`,
        description: reason,
        relatedHref: "/dashboard/",
      })

      return dispute
    })

    if (result === null) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }
    if (result === "not-disputable") {
      return NextResponse.json(
        { error: "This deal can't be disputed in its current state" },
        { status: 409 },
      )
    }
    if (result === "already-open") {
      return NextResponse.json({ error: "A dispute is already open for this deal" }, { status: 409 })
    }

    return NextResponse.json({ id: result.id, status: result.status, deal: await getDealForViewer(id, user.id) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/deals/[id]/dispute failed", error)
    return NextResponse.json({ error: "Failed to open dispute" }, { status: 500 })
  }
}
