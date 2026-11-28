import { NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealParticipants, deals, disputeEvents, disputes, walletTransactions } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { isUuid } from "@/lib/ids"
import { notifyOtherParticipants } from "@/lib/notifications"
import { logDealEvent } from "@/lib/deal-events"

/**
 * "needs-info" asks the parties for more evidence. The two outcomes close the dispute AND settle the
 * escrow in the same transaction: "refund_buyer" returns the held funds and cancels the deal,
 * "release_to_seller" pays the seller and completes it. ("resolved" is the old name for release.)
 */
const ACTIONS = ["needs-info", "refund_buyer", "release_to_seller", "resolved"] as const
type Action = (typeof ACTIONS)[number]

type DecisionResult =
  | { ok: true; id: string; status: string }
  | { ok: false; status: number; error: string }

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
    if (!isUuid(id)) return NextResponse.json({ error: "Dispute not found" }, { status: 404 })
    const body = (await req.json().catch(() => ({}))) as { action?: unknown }
    const requested = body.action as Action
    if (!ACTIONS.includes(requested)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
    const action = requested === "resolved" ? "release_to_seller" : requested

    const result = await db.transaction(async (tx): Promise<DecisionResult> => {
      const dispute = (await tx.select().from(disputes).where(eq(disputes.id, id)).limit(1).for("update"))[0]
      if (!dispute) return { ok: false, status: 404, error: "Dispute not found" }
      if (dispute.status === "resolved") return { ok: false, status: 409, error: "This dispute is already resolved" }

      const deal = (await tx.select().from(deals).where(eq(deals.id, dispute.dealId)).limit(1).for("update"))[0]
      if (!deal) return { ok: false, status: 404, error: "Deal not found" }

      if (action === "needs-info") {
        await tx.update(disputes).set({ status: "needs-info" }).where(eq(disputes.id, dispute.id))
        await tx.insert(disputeEvents).values({
          disputeId: dispute.id,
          actorUserId: user.id,
          text: "Admin requested more information",
        })
        await notifyOtherParticipants(tx, deal.id, user.id, {
          type: "deal",
          title: `More info needed for "${deal.title}"`,
          description: "Reply on the dispute in Support with the requested details.",
          relatedHref: "/dashboard/support/",
        })
        return { ok: true, id: dispute.id, status: "needs-info" }
      }

      if (deal.status !== "disputed") {
        return { ok: false, status: 409, error: `The deal is "${deal.status}", not disputed — nothing to settle` }
      }

      // What is actually held for this deal, net of anything already refunded or paid out.
      const [held] = await tx
        .select({
          hold: sql<string>`coalesce(sum(case when ${walletTransactions.type} = 'escrow_hold' then -${walletTransactions.amount} else 0 end), 0)`,
          settled: sql<string>`coalesce(sum(case when ${walletTransactions.type} in ('refund', 'payout') then ${walletTransactions.amount} else 0 end), 0)`,
        })
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.relatedDealId, deal.id),
            eq(walletTransactions.status, "completed"),
            inArray(walletTransactions.type, ["escrow_hold", "refund", "payout"]),
          ),
        )
      const amount = Math.round((Number(held.hold) - Number(held.settled)) * 100) / 100

      const participants = await tx
        .select({ userId: dealParticipants.userId, role: dealParticipants.role })
        .from(dealParticipants)
        .where(eq(dealParticipants.dealId, deal.id))
      const buyerId = participants.find((p) => p.role === "buyer")?.userId ?? null
      const sellerId = participants.find((p) => p.role === "seller")?.userId ?? null

      const refund = action === "refund_buyer"
      const recipient = refund ? buyerId : sellerId
      if (amount > 0) {
        if (!recipient) return { ok: false, status: 409, error: `The ${refund ? "buyer" : "seller"} isn't on this deal` }
        await tx.insert(walletTransactions).values({
          userId: recipient,
          type: refund ? "refund" : "payout",
          amount: amount.toFixed(2),
          status: "completed",
          relatedDealId: deal.id,
          description: refund ? `Dispute refund — ${deal.title}` : `Payout after dispute — ${deal.title}`,
        })
      }

      await tx
        .update(deals)
        .set({
          status: refund ? "cancelled" : "completed",
          ...(refund ? {} : { completedAt: new Date() }),
          updatedAt: new Date(),
        })
        .where(eq(deals.id, deal.id))
      await tx.update(disputes).set({ status: "resolved", resolvedAt: new Date() }).where(eq(disputes.id, dispute.id))

      const money = `${amount.toFixed(2)} ${deal.currency}`
      const outcome = refund
        ? `Dispute resolved in the buyer's favour — ${money} refunded to the buyer`
        : `Dispute resolved in the seller's favour — ${money} released to the seller`
      await tx.insert(disputeEvents).values({ disputeId: dispute.id, actorUserId: user.id, text: outcome })
      await logDealEvent(tx, { dealId: deal.id, actorUserId: null, type: "dispute_resolved", message: outcome })
      await notifyOtherParticipants(tx, deal.id, user.id, {
        type: "deal",
        title: `Dispute resolved for "${deal.title}"`,
        description: outcome,
        relatedHref: "/dashboard/support/",
      })

      return { ok: true, id: dispute.id, status: "resolved" }
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ id: result.id, status: result.status })
  } catch (error) {
    console.error("POST /api/admin/disputes/[id]/decision failed", error)
    return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 })
  }
}
