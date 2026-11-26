import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, passwordResetTokens } from "@/db/schema"
import { forgotPasswordSchema } from "@/lib/auth/schemas"
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { createResetToken } from "@/lib/auth/tokens"
import { sendPasswordResetEmail } from "@/lib/email"

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: Request) {
  const ipLimit = rateLimit(`forgot-ip:${clientIp(req)}`, 10, 60 * 60 * 1000)
  if (!ipLimit.ok) return tooManyRequests(ipLimit)

  try {
    const raw = await req.json()
    const parsed = forgotPasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const { email } = parsed.data
    // Don't let anyone flood one inbox with reset mails; still answer 200 to not leak existence.
    if (!rateLimit(`forgot-email:${email}`, 3, 60 * 60 * 1000).ok) {
      return NextResponse.json({ ok: true })
    }

    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    const user = rows[0]

    // Always respond 200 whether or not the account exists — don't leak account existence.
    if (user) {
      const { raw: rawToken, hash } = createResetToken()
      // Only the newest link works: retire any earlier unused ones.
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)))
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      })

      const appUrl = process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? "https://www.paypack.uno" : "http://localhost:3000")
      const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`
      await sendPasswordResetEmail(email, resetUrl)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("forgot-password failed", error)
    return NextResponse.json({ ok: true })
  }
}
