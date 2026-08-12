import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { notificationPreferences } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

const BOOLEAN_FIELDS = [
  "emailDealUpdates",
  "emailPaymentReceived",
  "emailMarketing",
  "pushNewMessages",
  "pushShippingUpdates",
  "pushSecurityAlerts",
] as const

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    const patch: Record<string, boolean> = {}
    for (const field of BOOLEAN_FIELDS) {
      if (typeof body[field] === "boolean") patch[field] = body[field] as boolean
    }

    const existing = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1)

    const rows = existing[0]
      ? await db
          .update(notificationPreferences)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, user.id))
          .returning()
      : await db
          .insert(notificationPreferences)
          .values({ userId: user.id, ...patch })
          .returning()

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error("PATCH /api/settings/notifications failed", error)
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 })
  }
}
