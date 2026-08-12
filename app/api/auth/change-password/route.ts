import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { changePasswordSchema } from "@/lib/auth/schemas"
import {
  getCurrentUser,
  hashPassword,
  verifyPassword,
  signSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const raw = await req.json()
    const parsed = changePasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }
    const { currentPassword, newPassword } = parsed.data

    const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
    const row = rows[0]
    if (!row) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const valid = await verifyPassword(currentPassword, row.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const passwordHash = await hashPassword(newPassword)
    const nextSessionVersion = row.sessionVersion + 1
    const updated = await db
      .update(users)
      .set({ passwordHash, sessionVersion: nextSessionVersion, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning()
    const updatedUser = updated[0]

    // Bumping session_version invalidates every other session; re-sign this one so the
    // user isn't logged out of the device they just used to change their own password.
    const token = await signSession({
      sub: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      sv: updatedUser.sessionVersion,
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return response
  } catch (error) {
    console.error("POST /api/auth/change-password failed", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
