import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { kycVerifications, riskFlags, users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

const NEW_ACCOUNT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const outcome = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ userId: kycVerifications.userId, status: kycVerifications.status })
        .from(kycVerifications)
        .where(eq(kycVerifications.userId, user.id))
        .limit(1)

      // Re-submitting must never undo an approval, and a pending request is already in the queue.
      if (existing[0]?.status === "approved") return "already-approved" as const
      if (existing[0]?.status === "pending") return "already-pending" as const

      if (existing[0]) {
        await tx
          .update(kycVerifications)
          .set({ status: "pending", updatedAt: new Date() })
          .where(eq(kycVerifications.userId, user.id))
      } else {
        await tx.insert(kycVerifications).values({ userId: user.id, status: "pending" })
      }

      const userRow = (await tx.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, user.id)).limit(1))[0]
      const isNewAccount = userRow && Date.now() - userRow.createdAt.getTime() < NEW_ACCOUNT_THRESHOLD_MS
      if (isNewAccount) {
        const existingFlag = await tx
          .select({ id: riskFlags.id })
          .from(riskFlags)
          .where(and(eq(riskFlags.userId, user.id), eq(riskFlags.label, "New account")))
          .limit(1)
        if (!existingFlag[0]) {
          await tx.insert(riskFlags).values({ userId: user.id, label: "New account", source: "system" })
        }
      }
      return "submitted" as const
    })

    if (outcome === "already-approved") {
      return NextResponse.json({ error: "Your account is already verified" }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/kyc/submit failed", error)
    return NextResponse.json({ error: "Failed to submit for verification" }, { status: 500 })
  }
}
