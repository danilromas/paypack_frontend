import "server-only"
import type { PgTransaction } from "drizzle-orm/pg-core"
import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealEvents, users } from "@/db/schema"
import type { DealEventDTO, DealEventType } from "@/lib/deals"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbOrTx = typeof db | PgTransaction<any, any, any>

/** Appends one entry to a deal's timeline. Call it inside the same transaction as the change it records. */
export async function logDealEvent(
  tx: DbOrTx,
  input: { dealId: string; actorUserId: string | null; type: DealEventType; message?: string },
) {
  await tx.insert(dealEvents).values({
    dealId: input.dealId,
    actorUserId: input.actorUserId,
    type: input.type,
    message: input.message ?? "",
  })
}

/** The deal's timeline, oldest first. Callers must already have checked the viewer is a participant. */
export async function listDealEvents(dealId: string): Promise<DealEventDTO[]> {
  const rows = await db
    .select({
      id: dealEvents.id,
      type: dealEvents.type,
      message: dealEvents.message,
      actorUserId: dealEvents.actorUserId,
      actorName: users.name,
      createdAt: dealEvents.createdAt,
    })
    .from(dealEvents)
    .leftJoin(users, eq(users.id, dealEvents.actorUserId))
    .where(eq(dealEvents.dealId, dealId))
    .orderBy(asc(dealEvents.createdAt))
  return rows.map((r) => ({
    id: r.id,
    type: r.type as DealEventType,
    message: r.message,
    actorUserId: r.actorUserId,
    actorName: r.actorName ?? null,
    createdAt: r.createdAt.toISOString(),
  }))
}
