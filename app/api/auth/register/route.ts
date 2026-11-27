import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { registerSchema } from "@/lib/auth/schemas"
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { isUniqueViolation } from "@/lib/db-errors"
import { hashPassword, signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session"

export async function POST(req: Request) {
  const limit = rateLimit(`register-ip:${clientIp(req)}`, 10, 60 * 60 * 1000)
  if (!limit.ok) return tooManyRequests(limit)

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

    // Deal invites are claimed only through the invite link (POST /api/deals/[id]/join). We used to
    // attach pending email invites here, but the email isn't verified, so anyone registering with a
    // stranger's address could take their place in a deal.

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
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }
    console.error("register failed", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
