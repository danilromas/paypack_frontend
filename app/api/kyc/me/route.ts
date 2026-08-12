import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { kycVerifications } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const rows = await db.select().from(kycVerifications).where(eq(kycVerifications.userId, user.id)).limit(1)
    const row = rows[0]
    return NextResponse.json({
      status: row?.status ?? "unverified",
      riskLevel: row?.riskLevel ?? "low",
      reviewedAt: row?.reviewedAt ? row.reviewedAt.toISOString() : null,
    })
  } catch (error) {
    console.error("GET /api/kyc/me failed", error)
    return NextResponse.json({ error: "Failed to fetch verification status" }, { status: 500 })
  }
}
