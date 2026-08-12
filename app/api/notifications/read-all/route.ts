import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { notifications } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/notifications/read-all failed", error)
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }
}
