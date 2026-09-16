import "server-only"
import type { PgTransaction } from "drizzle-orm/pg-core"
import { and, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealParticipants, chatThreads, deals, users } from "@/db/schema"
import { toDeal, type DealRowForViewer } from "@/lib/deals"
import { notifyOtherParticipants } from "@/lib/notifications"
import type { Deal } from "@/types"

export type DealRole = "buyer" | "seller"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbOrTx = typeof db | PgTransaction<any, any, any>

/** The requesting user's role on this deal, or null if they're not a joined participant. */
export async function getParticipantRole(dealId: string, userId: string): Promise<DealRole | null> {
  const rows = await db
    .select({ role: dealParticipants.role })
    .from(dealParticipants)
    .where(and(eq(dealParticipants.dealId, dealId), eq(dealParticipants.userId, userId)))
    .limit(1)
  return (rows[0]?.role as DealRole | undefined) ?? null
}

export async function getOtherParticipantUserId(dealId: string, actorUserId: string): Promise<string | null> {
  const rows = await db
    .select({ userId: dealParticipants.userId })
    .from(dealParticipants)
    .where(and(eq(dealParticipants.dealId, dealId), ne(dealParticipants.userId, actorUserId)))
    .limit(1)
  return rows[0]?.userId ?? null
}

const DEAL_FOR_VIEWER_SELECT = sql`
  SELECT
    d.id, d.title, d.description, d.image_url AS "imageUrl", d.price, d.shipping_price AS "shippingPrice",
    d.currency, d.status, d.role, d.counterparty, d.counterparty_avatar AS "counterpartyAvatar",
    d.source_url AS "sourceUrl", d.source_platform AS "sourcePlatform",
    d.payment_method AS "paymentMethod", d.payment_crypto_coin AS "paymentCryptoCoin",
    d.carrier, d.tracking_number AS "trackingNumber",
    d.created_at AS "createdAt", d.updated_at AS "updatedAt",
    dp.role AS "myRole",
    coalesce(other_user.name, other_dp.invited_email) AS "counterpartyName",
    (other_dp.joined_at IS NOT NULL) AS "counterpartyJoined"
  FROM deal_participants dp
  JOIN deals d ON d.id = dp.deal_id
  LEFT JOIN deal_participants other_dp ON other_dp.deal_id = dp.deal_id AND other_dp.id <> dp.id
  LEFT JOIN users other_user ON other_user.id = other_dp.user_id
`

/** All deals the given user is a joined participant of (as creator or invited counterparty), newest first. */
export async function listDealsForViewer(userId: string): Promise<Deal[]> {
  const result = await db.execute(sql`
    ${DEAL_FOR_VIEWER_SELECT}
    WHERE dp.user_id = ${userId}
    ORDER BY d.created_at DESC
  `)
  return (result.rows as unknown as DealRowForViewer[]).map(toDeal)
}

/** A single deal, resolved for this viewer — null if the deal doesn't exist or they're not a participant. */
export async function getDealForViewer(dealId: string, userId: string): Promise<Deal | null> {
  const result = await db.execute(sql`
    ${DEAL_FOR_VIEWER_SELECT}
    WHERE dp.user_id = ${userId} AND d.id = ${dealId}
    LIMIT 1
  `)
  const row = result.rows[0] as unknown as DealRowForViewer | undefined
  return row ? toDeal(row) : null
}

/**
 * Creates the deal creator's participant row (if missing) and ensures a chat thread exists.
 * The counterparty slot is intentionally left open — they attach themselves via `joinDealByLink`
 * when they open the deal's invite link. Idempotent — safe to call again for the same deal.
 */
export async function ensureCreatorParticipant(
  tx: DbOrTx,
  deal: { id: string; role: DealRole },
  creatorUserId: string,
): Promise<{ threadId: string }> {
  const creatorRows = await tx
    .select({ id: dealParticipants.id })
    .from(dealParticipants)
    .where(and(eq(dealParticipants.dealId, deal.id), eq(dealParticipants.userId, creatorUserId)))
    .limit(1)
  if (!creatorRows[0]) {
    await tx.insert(dealParticipants).values({
      dealId: deal.id,
      userId: creatorUserId,
      role: deal.role,
      joinedAt: new Date(),
    })
  }

  const threadRows = await tx.select().from(chatThreads).where(eq(chatThreads.dealId, deal.id)).limit(1)
  const thread = threadRows[0] ?? (await tx.insert(chatThreads).values({ dealId: deal.id }).returning())[0]

  return { threadId: thread.id }
}

export type JoinDealResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Attaches the given user as the counterparty on a pending deal via its invite link. The deal's own
 * UUID is the "token" — unguessable, same trust model `/api/deals/[id]/accept` already relies on.
 * The partial unique index on (deal_id, role) where user_id is not null makes a concurrent double-join
 * fail cleanly instead of silently overwriting the first joiner.
 */
export async function joinDealByLink(
  tx: DbOrTx,
  dealId: string,
  joiningUserId: string,
): Promise<JoinDealResult> {
  const dealRows = await tx.select().from(deals).where(eq(deals.id, dealId)).limit(1)
  const deal = dealRows[0]
  if (!deal) return { ok: false, error: "Invite not found" }
  if (deal.status !== "pending") return { ok: false, error: "This deal is no longer awaiting a counterparty" }
  if (deal.userId === joiningUserId) return { ok: false, error: "You created this deal — share the link with the other side" }

  const existing = await tx
    .select({ id: dealParticipants.id })
    .from(dealParticipants)
    .where(and(eq(dealParticipants.dealId, dealId), eq(dealParticipants.userId, joiningUserId)))
    .limit(1)
  if (existing[0]) return { ok: false, error: "You're already part of this deal" }

  const counterpartyRole: DealRole = deal.role === "buyer" ? "seller" : "buyer"
  try {
    await tx.insert(dealParticipants).values({
      dealId,
      userId: joiningUserId,
      role: counterpartyRole,
      joinedAt: new Date(),
    })
  } catch {
    return { ok: false, error: "This invite was already used" }
  }

  await notifyOtherParticipants(tx, dealId, joiningUserId, {
    type: "deal",
    title: `Your counterparty joined "${deal.title}"`,
    relatedHref: "/dashboard/deals",
  })

  return { ok: true }
}

export interface DealInvitePreview {
  id: string
  title: string
  price: string | number
  currency: string
  role: DealRole
  status: string
  creatorName: string
  creatorUserId: string
}

/**
 * Minimal deal info for the invite/join page, shown to someone who is NOT yet a participant —
 * unlike `getDealForViewer`, this doesn't require the caller to already be attached to the deal.
 */
export async function getDealPreviewForInvite(dealId: string): Promise<DealInvitePreview | null> {
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      price: deals.price,
      currency: deals.currency,
      role: deals.role,
      status: deals.status,
      creatorName: users.name,
      creatorUserId: deals.userId,
    })
    .from(deals)
    .innerJoin(users, eq(users.id, deals.userId))
    .where(eq(deals.id, dealId))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return { ...row, role: row.role as DealRole }
}
