import "server-only"
import type { PgTransaction } from "drizzle-orm/pg-core"
import { db } from "@/lib/db"
import { dealParticipants, notifications } from "@/db/schema"
import { and, eq, isNotNull, ne } from "drizzle-orm"

export type NotificationType = "deal" | "shipment" | "security" | "wallet" | "chat"

export interface NotificationDTO {
  id: string
  type: NotificationType
  title: string
  description: string
  relatedHref: string | null
  readAt: string | null
  createdAt: string
}

type NotificationRow = typeof notifications.$inferSelect
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbOrTx = typeof db | PgTransaction<any, any, any>

export function toNotificationDTO(row: NotificationRow): NotificationDTO {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    description: row.description,
    relatedHref: row.relatedHref,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function notifyUser(
  tx: DbOrTx,
  input: { userId: string; type: NotificationType; title: string; description?: string; relatedHref?: string },
) {
  await tx.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    description: input.description ?? "",
    relatedHref: input.relatedHref ?? null,
  })
}

/** Notifies every joined participant of a deal except the given actor. */
export async function notifyOtherParticipants(
  tx: DbOrTx,
  dealId: string,
  actorUserId: string,
  input: { type: NotificationType; title: string; description?: string; relatedHref?: string },
) {
  const others = await tx
    .select({ userId: dealParticipants.userId })
    .from(dealParticipants)
    .where(
      and(
        eq(dealParticipants.dealId, dealId),
        isNotNull(dealParticipants.userId),
        ne(dealParticipants.userId, actorUserId),
      ),
    )

  for (const other of others) {
    if (!other.userId) continue
    await notifyUser(tx, { ...input, userId: other.userId })
  }
}
