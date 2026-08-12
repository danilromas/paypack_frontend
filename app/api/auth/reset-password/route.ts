import { NextResponse } from "next/server"
import { and, eq, gt, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, passwordResetTokens } from "@/db/schema"
import { resetPasswordSchema } from "@/lib/auth/schemas"
import { hashPassword } from "@/lib/auth/session"
import { hashResetToken } from "@/lib/auth/tokens"

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = resetPasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }
    const { token, password } = parsed.data
    const tokenHash = hashResetToken(token)

    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)

    const resetToken = rows[0]
    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    await db
      .update(users)
      .set({
        passwordHash,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, resetToken.userId))

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("reset-password failed", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
