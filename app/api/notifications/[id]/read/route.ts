import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { notifications } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { toNotificationDTO } from "@/lib/notifications"

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const rows = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
      .returning()

    if (!rows[0]) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json(toNotificationDTO(rows[0]))
  } catch (error) {
    console.error("POST /api/notifications/[id]/read failed", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}
