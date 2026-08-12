import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { listChatThreads } from "@/lib/chat"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const threads = await listChatThreads(user.id)
    return NextResponse.json(threads)
  } catch (error) {
    console.error("GET /api/chats failed", error)
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 })
  }
}
