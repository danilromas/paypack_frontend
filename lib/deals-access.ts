import "server-only"
import type { PgTransaction } from "drizzle-orm/pg-core"
import { and, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealParticipants, chatThreads, users } from "@/db/schema"
import { toDeal, type DealRowForViewer } from "@/lib/deals"
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
 * Links a deal to its creator and a counterparty (by email — either an existing account or a pending
 * invite claimed at registration), and ensures a chat thread exists. Idempotent — safe to call again for
 * the same deal/email. Shared by deal creation (email is required up front) and the standalone invite
 * endpoint (kept as a fallback for deals that predate this, or where the invite needs to be resent).
 */
export async function ensureParticipantsAndThread(
  tx: DbOrTx,
  deal: { id: string; role: DealRole },
  creatorUserId: string,
  counterpartyEmail: string,
): Promise<{ threadId: string; counterpartyJoined: boolean }> {
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

  const counterpartyRole: DealRole = deal.role === "buyer" ? "seller" : "buyer"
  const counterpartyUserRows = await tx.select({ id: users.id }).from(users).where(eq(users.email, counterpartyEmail)).limit(1)
  const counterpartyUser = counterpartyUserRows[0]

  const existingParticipant = counterpartyUser
    ? (
        await tx
          .select({ id: dealParticipants.id })
          .from(dealParticipants)
          .where(and(eq(dealParticipants.dealId, deal.id), eq(dealParticipants.userId, counterpartyUser.id)))
          .limit(1)
      )[0]
    : (
        await tx
          .select({ id: dealParticipants.id })
          .from(dealParticipants)
          .where(and(eq(dealParticipants.dealId, deal.id), eq(dealParticipants.invitedEmail, counterpartyEmail)))
          .limit(1)
      )[0]

  if (!existingParticipant) {
    await tx.insert(dealParticipants).values(
      counterpartyUser
        ? { dealId: deal.id, userId: counterpartyUser.id, role: counterpartyRole, joinedAt: new Date() }
        : { dealId: deal.id, invitedEmail: counterpartyEmail, role: counterpartyRole },
    )
  }

  const threadRows = await tx.select().from(chatThreads).where(eq(chatThreads.dealId, deal.id)).limit(1)
  const thread = threadRows[0] ?? (await tx.insert(chatThreads).values({ dealId: deal.id }).returning())[0]

  return { threadId: thread.id, counterpartyJoined: Boolean(counterpartyUser) }
}
