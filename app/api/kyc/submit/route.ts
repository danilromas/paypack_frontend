import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { kycDocuments, kycVerifications, riskFlags, users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { normalizeDocuments } from "@/lib/kyc"

const NEW_ACCOUNT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { documents?: unknown }
    const documents = normalizeDocuments(body.documents)

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ userId: kycVerifications.userId })
        .from(kycVerifications)
        .where(eq(kycVerifications.userId, user.id))
        .limit(1)

      if (existing[0]) {
        await tx
          .update(kycVerifications)
          .set({ status: "pending", updatedAt: new Date() })
          .where(eq(kycVerifications.userId, user.id))
      } else {
        await tx.insert(kycVerifications).values({ userId: user.id, status: "pending" })
      }

      for (const doc of documents) {
        await tx.insert(kycDocuments).values({ userId: user.id, docType: doc.docType, fileUrl: doc.fileUrl })
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
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/kyc/submit failed", error)
    return NextResponse.json({ error: "Failed to submit for verification" }, { status: 500 })
  }
}
