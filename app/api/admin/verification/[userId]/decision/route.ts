import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { kycVerifications, riskFlags } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { notifyUser } from "@/lib/notifications"

const ACTIONS = ["pending", "approved", "rejected"] as const

export async function POST(req: Request, context: { params: Promise<{ userId: string }> }) {
  const admin = await getCurrentUser()
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { userId } = await context.params
    const body = (await req.json()) as { action?: unknown }
    const action = body.action as (typeof ACTIONS)[number]
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ userId: kycVerifications.userId })
        .from(kycVerifications)
        .where(eq(kycVerifications.userId, userId))
        .limit(1)

      const values = {
        status: action,
        reviewedByUserId: admin.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      }

      if (existing[0]) {
        await tx.update(kycVerifications).set(values).where(eq(kycVerifications.userId, userId))
      } else {
        await tx.insert(kycVerifications).values({ userId, ...values })
      }

      if (action === "rejected") {
        const existingFlag = await tx
          .select({ id: riskFlags.id })
          .from(riskFlags)
          .where(and(eq(riskFlags.userId, userId), eq(riskFlags.label, "Restricted by admin")))
          .limit(1)
        if (!existingFlag[0]) {
          await tx.insert(riskFlags).values({ userId, label: "Restricted by admin", source: "admin" })
        }
      }

      const title =
        action === "approved"
          ? "Your verification was approved"
          : action === "rejected"
            ? "Your account has been restricted"
            : "More information needed for verification"

      await notifyUser(tx, {
        userId,
        type: "security",
        title,
        relatedHref: "/dashboard/settings/",
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/admin/verification/[userId]/decision failed", error)
    return NextResponse.json({ error: "Failed to update verification" }, { status: 500 })
  }
}
