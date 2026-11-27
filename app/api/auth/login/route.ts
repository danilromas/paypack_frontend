import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { loginSchema } from "@/lib/auth/schemas"
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { hashPassword, verifyPassword, signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session"

// Equalises response time for unknown emails so login can't be used to probe which accounts exist.
let dummyHash: Promise<string> | null = null
const getDummyHash = () => (dummyHash ??= hashPassword("paypack-timing-equaliser"))

export async function POST(req: Request) {
  const ipLimit = rateLimit(`login-ip:${clientIp(req)}`, 30, 15 * 60 * 1000)
  if (!ipLimit.ok) return tooManyRequests(ipLimit)

  try {
    const raw = await req.json()
    const parsed = loginSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 })
    }
    const { email, password } = parsed.data
    const emailLimit = rateLimit(`login-email:${email}`, 10, 15 * 60 * 1000)
    if (!emailLimit.ok) return tooManyRequests(emailLimit, "Too many sign-in attempts. Try again in a few minutes.")

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const user = rows[0]
    if (!user) {
      await verifyPassword(password, await getDummyHash())
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (user.status === "suspended") {
      return NextResponse.json({ error: "This account has been suspended. Contact support." }, { status: 403 })
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
    console.error("login failed", error)
    return NextResponse.json({ error: "Failed to log in" }, { status: 500 })
  }
}
