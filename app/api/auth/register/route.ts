import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, dealParticipants } from "@/db/schema"
import { registerSchema } from "@/lib/auth/schemas"
import { hashPassword, signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session"

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = registerSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }
    const { name, email, password } = parsed.data

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing[0]) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const inserted = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning()
    const user = inserted[0]

    // Claim any pending deal invites sent to this email before they had an account.
    try {
      await db
        .update(dealParticipants)
        .set({ userId: user.id, joinedAt: new Date() })
        .where(and(eq(dealParticipants.invitedEmail, user.email), isNull(dealParticipants.userId)))
    } catch (claimError) {
      console.error("Failed to claim pending invites for new user", claimError)
    }

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sv: user.sessionVersion,
    })

    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return response
  } catch (error) {
    console.error("register failed", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
