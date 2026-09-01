import "server-only"
import { asc, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, dealParticipants, disputeEvents, disputes, users } from "@/db/schema"

export type DisputeStatus = "open" | "needs-info" | "resolved"

export interface DisputeEventDTO {
  id: string
  actorName: string | null
  text: string
  createdAt: string
}

export interface DisputeDTO {
  id: string
  dealId: string
  dealTitle: string
  openedByUserId: string
  openedByName: string
  status: DisputeStatus
  reason: string
  amount: number
  currency: string
  createdAt: string
  resolvedAt: string | null
  events: DisputeEventDTO[]
  myRole?: "buyer" | "seller"
  counterpartyName?: string | null
}

export async function listDisputesForAdmin(): Promise<DisputeDTO[]> {
  const rows = await db
    .select({
      id: disputes.id,
      dealId: disputes.dealId,
      dealTitle: deals.title,
      price: deals.price,
      shippingPrice: deals.shippingPrice,
      currency: deals.currency,
      openedByUserId: disputes.openedByUserId,
      openedByName: users.name,
      status: disputes.status,
      reason: disputes.reason,
      createdAt: disputes.createdAt,
      resolvedAt: disputes.resolvedAt,
    })
    .from(disputes)
    .innerJoin(deals, eq(disputes.dealId, deals.id))
    .innerJoin(users, eq(disputes.openedByUserId, users.id))
    .orderBy(desc(disputes.createdAt))

  const eventRows = await db
    .select({
      id: disputeEvents.id,
      disputeId: disputeEvents.disputeId,
      actorName: users.name,
      text: disputeEvents.text,
      createdAt: disputeEvents.createdAt,
    })
    .from(disputeEvents)
    .leftJoin(users, eq(disputeEvents.actorUserId, users.id))
    .orderBy(asc(disputeEvents.createdAt))

  const eventsByDispute = new Map<string, DisputeEventDTO[]>()
  for (const e of eventRows) {
    const list = eventsByDispute.get(e.disputeId) ?? []
    list.push({ id: e.id, actorName: e.actorName, text: e.text, createdAt: e.createdAt.toISOString() })
    eventsByDispute.set(e.disputeId, list)
  }

  return rows.map((r) => ({
    id: r.id,
    dealId: r.dealId,
    dealTitle: r.dealTitle,
    openedByUserId: r.openedByUserId,
    openedByName: r.openedByName,
    status: r.status as DisputeStatus,
    reason: r.reason,
    amount: Number(r.price) + Number(r.shippingPrice),
    currency: r.currency,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    events: eventsByDispute.get(r.id) ?? [],
  }))
}

export async function listDisputesForUser(userId: string): Promise<DisputeDTO[]> {
  const rows = await db
    .select({
      id: disputes.id,
      dealId: disputes.dealId,
      dealTitle: deals.title,
      price: deals.price,
      shippingPrice: deals.shippingPrice,
      currency: deals.currency,
      openedByUserId: disputes.openedByUserId,
      openedByName: users.name,
      status: disputes.status,
      reason: disputes.reason,
      createdAt: disputes.createdAt,
      resolvedAt: disputes.resolvedAt,
    })
    .from(disputes)
    .innerJoin(deals, eq(disputes.dealId, deals.id))
    .innerJoin(users, eq(disputes.openedByUserId, users.id))
    .innerJoin(
      dealParticipants,
      eq(dealParticipants.dealId, disputes.dealId),
    )
    .where(eq(dealParticipants.userId, userId))
    .orderBy(desc(disputes.createdAt))

  if (rows.length === 0) return []

  const dealIds = [...new Set(rows.map((r) => r.dealId))]
  const participantRows = await db
    .select({
      dealId: dealParticipants.dealId,
      userId: dealParticipants.userId,
      role: dealParticipants.role,
      name: users.name,
    })
    .from(dealParticipants)
    .leftJoin(users, eq(dealParticipants.userId, users.id))
    .where(inArray(dealParticipants.dealId, dealIds))

  const participantsByDeal = new Map<string, typeof participantRows>()
  for (const p of participantRows) {
    const list = participantsByDeal.get(p.dealId) ?? []
    list.push(p)
    participantsByDeal.set(p.dealId, list)
  }

  const eventRows = await db
    .select({
      id: disputeEvents.id,
      disputeId: disputeEvents.disputeId,
      actorName: users.name,
      text: disputeEvents.text,
      createdAt: disputeEvents.createdAt,
    })
    .from(disputeEvents)
    .leftJoin(users, eq(disputeEvents.actorUserId, users.id))
    .where(
      inArray(
        disputeEvents.disputeId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(disputeEvents.createdAt))

  const eventsByDispute = new Map<string, DisputeEventDTO[]>()
  for (const e of eventRows) {
    const list = eventsByDispute.get(e.disputeId) ?? []
    list.push({ id: e.id, actorName: e.actorName, text: e.text, createdAt: e.createdAt.toISOString() })
    eventsByDispute.set(e.disputeId, list)
  }

  return rows.map((r) => {
    const participants = participantsByDeal.get(r.dealId) ?? []
    const mine = participants.find((p) => p.userId === userId)
    const other = participants.find((p) => p.userId !== userId)
    return {
      id: r.id,
      dealId: r.dealId,
      dealTitle: r.dealTitle,
      openedByUserId: r.openedByUserId,
      openedByName: r.openedByName,
      status: r.status as DisputeStatus,
      reason: r.reason,
      amount: Number(r.price) + Number(r.shippingPrice),
      currency: r.currency,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      events: eventsByDispute.get(r.id) ?? [],
      myRole: mine?.role as "buyer" | "seller" | undefined,
      counterpartyName: other?.name ?? null,
    }
  })
}

export function validateReason(reason: unknown): string | null {
  if (typeof reason !== "string" || !reason.trim()) {
    return "Enter a reason for the dispute"
  }
  if (reason.length > 2000) {
    return "Reason is too long"
  }
  return null
}

export function validateDisputeMessage(text: unknown): string | null {
  if (typeof text !== "string" || !text.trim()) {
    return "Enter a message"
  }
  if (text.length > 2000) {
    return "Message is too long"
  }
  return null
}
