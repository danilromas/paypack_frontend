import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, passwordResetTokens } from "@/db/schema"
import { forgotPasswordSchema } from "@/lib/auth/schemas"
import { createResetToken } from "@/lib/auth/tokens"
import { sendPasswordResetEmail } from "@/lib/email"

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = forgotPasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const { email } = parsed.data

    const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    const user = rows[0]

    // Always respond 200 whether or not the account exists — don't leak account existence.
    if (user) {
      const { raw: rawToken, hash } = createResetToken()
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      })

      const appUrl = process.env.APP_URL ?? "http://localhost:3000"
      const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`
      await sendPasswordResetEmail(email, resetUrl)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("forgot-password failed", error)
    return NextResponse.json({ ok: true })
  }
}
