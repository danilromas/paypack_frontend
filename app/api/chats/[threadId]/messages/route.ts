import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chatMessages } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import {
  getMembershipDealId,
  listThreadMessages,
  markThreadRead,
  toChatMessageDTO,
  validateMessageContent,
} from "@/lib/chat"

export async function GET(req: Request, context: { params: Promise<{ threadId: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { threadId } = await context.params
    const dealId = await getMembershipDealId(threadId, user.id)
    if (!dealId) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    await markThreadRead(threadId, user.id)

    const url = new URL(req.url)
    const afterParam = url.searchParams.get("after")
    const after = afterParam && !Number.isNaN(Date.parse(afterParam)) ? new Date(afterParam) : null

    const rows = await listThreadMessages(threadId, after)
    return NextResponse.json(rows.map((row) => toChatMessageDTO(row, user.id)))
  } catch (error) {
    console.error("GET /api/chats/[threadId]/messages failed", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(req: Request, context: { params: Promise<{ threadId: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { threadId } = await context.params
    const dealId = await getMembershipDealId(threadId, user.id)
    if (!dealId) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const body = (await req.json()) as { content?: unknown }
    const content = typeof body.content === "string" ? body.content.trim() : ""
    const validationError = validateMessageContent(content)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const inserted = await db
      .insert(chatMessages)
      .values({ threadId, senderUserId: user.id, content })
      .returning()

    return NextResponse.json(toChatMessageDTO(inserted[0], user.id), { status: 201 })
  } catch (error) {
    console.error("POST /api/chats/[threadId]/messages failed", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
