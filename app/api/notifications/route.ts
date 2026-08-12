import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { notifications } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { toNotificationDTO } from "@/lib/notifications"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))

    return NextResponse.json(rows.map(toNotificationDTO))
  } catch (error) {
    console.error("GET /api/notifications failed", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
