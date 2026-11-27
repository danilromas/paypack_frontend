import { NextResponse } from "next/server"
import { and, eq, gt, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, passwordResetTokens } from "@/db/schema"
import { resetPasswordSchema } from "@/lib/auth/schemas"
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { hashPassword } from "@/lib/auth/session"
import { hashResetToken } from "@/lib/auth/tokens"

export async function POST(req: Request) {
  const limit = rateLimit(`reset-ip:${clientIp(req)}`, 20, 60 * 60 * 1000)
  if (!limit.ok) return tooManyRequests(limit)

  try {
    const raw = await req.json()
    const parsed = resetPasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }
    const { token, password } = parsed.data
    const tokenHash = hashResetToken(token)

    const passwordHash = await hashPassword(password)
    // Consume the token and change the password in one transaction: the conditional UPDATE means two
    // concurrent requests with the same link can't both succeed.
    const ok = await db.transaction(async (tx) => {
      const consumed = await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .returning({ userId: passwordResetTokens.userId })
      const resetToken = consumed[0]
      if (!resetToken) return false

      await tx
        .update(users)
        .set({
          passwordHash,
          sessionVersion: sql`${users.sessionVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, resetToken.userId))
      // Any other outstanding links for this account are void now too.
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.userId, resetToken.userId), isNull(passwordResetTokens.usedAt)))
      return true
    })
    if (!ok) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("reset-password failed", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
