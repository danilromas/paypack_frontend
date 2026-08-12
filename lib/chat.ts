import "server-only"
import { and, asc, desc, eq, gt, ne, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { chatMessages, chatThreads, dealParticipants } from "@/db/schema"

export interface ChatMessageDTO {
  id: string
  threadId: string
  senderId: string
  isMine: boolean
  content: string
  readAt: string | null
  createdAt: string
}

export interface ChatThreadSummaryDTO {
  threadId: string
  dealId: string
  dealTitle: string
  otherName: string | null
  otherInvitedEmail: string | null
  otherJoined: boolean
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

type ChatMessageRow = typeof chatMessages.$inferSelect

export function toChatMessageDTO(row: ChatMessageRow, currentUserId: string): ChatMessageDTO {
  return {
    id: row.id,
    threadId: row.threadId,
    senderId: row.senderUserId,
    isMine: row.senderUserId === currentUserId,
    content: row.content,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

export function validateMessageContent(content: unknown): string | null {
  if (typeof content !== "string" || !content.trim()) {
    return "Message can't be empty"
  }
  if (content.length > 4000) {
    return "Message is too long"
  }
  return null
}

/** Returns the deal_id for a thread the given user actually participates in, or null. */
export async function getMembershipDealId(threadId: string, userId: string): Promise<string | null> {
  const rows = await db
    .select({ dealId: chatThreads.dealId })
    .from(chatThreads)
    .innerJoin(
      dealParticipants,
      and(eq(dealParticipants.dealId, chatThreads.dealId), eq(dealParticipants.userId, userId)),
    )
    .where(eq(chatThreads.id, threadId))
    .limit(1)
  return rows[0]?.dealId ?? null
}

export async function markThreadRead(threadId: string, currentUserId: string) {
  await db
    .update(chatMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(chatMessages.threadId, threadId),
        ne(chatMessages.senderUserId, currentUserId),
        isNull(chatMessages.readAt),
      ),
    )
}

export async function listThreadMessages(threadId: string, after: Date | null) {
  const conditions = after
    ? and(eq(chatMessages.threadId, threadId), gt(chatMessages.createdAt, after))
    : eq(chatMessages.threadId, threadId)
  return db.select().from(chatMessages).where(conditions).orderBy(asc(chatMessages.createdAt))
}

export async function listChatThreads(userId: string): Promise<ChatThreadSummaryDTO[]> {
  const result = await db.execute(sql`
    SELECT
      ct.id AS thread_id,
      d.id AS deal_id,
      d.title AS deal_title,
      other_user.name AS other_name,
      other_dp.invited_email AS other_invited_email,
      (other_dp.joined_at IS NOT NULL) AS other_joined,
      lm.content AS last_message,
      lm.created_at AS last_message_at,
      coalesce(uc.unread_count, 0) AS unread_count
    FROM deal_participants dp
    JOIN chat_threads ct ON ct.deal_id = dp.deal_id
    JOIN deals d ON d.id = dp.deal_id
    LEFT JOIN deal_participants other_dp ON other_dp.deal_id = dp.deal_id AND other_dp.id <> dp.id
    LEFT JOIN users other_user ON other_user.id = other_dp.user_id
    LEFT JOIN LATERAL (
      SELECT content, created_at FROM chat_messages cm
      WHERE cm.thread_id = ct.id ORDER BY cm.created_at DESC LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS unread_count FROM chat_messages cm
      WHERE cm.thread_id = ct.id AND cm.sender_user_id <> ${userId} AND cm.read_at IS NULL
    ) uc ON true
    WHERE dp.user_id = ${userId}
    ORDER BY lm.created_at DESC NULLS LAST, ct.created_at DESC
  `)

  const rows = result.rows as Array<{
    thread_id: string
    deal_id: string
    deal_title: string
    other_name: string | null
    other_invited_email: string | null
    other_joined: boolean
    last_message: string | null
    last_message_at: string | null
    unread_count: number
  }>

  return rows.map((r) => ({
    threadId: r.thread_id,
    dealId: r.deal_id,
    dealTitle: r.deal_title,
    otherName: r.other_name,
    otherInvitedEmail: r.other_invited_email,
    otherJoined: r.other_joined,
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
    unreadCount: Number(r.unread_count),
  }))
}
