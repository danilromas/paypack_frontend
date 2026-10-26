import "server-only"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { kycVerifications, riskFlags, users } from "@/db/schema"

export type KycStatus = "unverified" | "pending" | "approved" | "rejected"
export type RiskLevel = "low" | "medium" | "high"

export interface VerificationUserDTO {
  userId: string
  name: string
  email: string
  status: KycStatus
  riskLevel: RiskLevel
  createdAccountAt: string
  reviewedAt: string | null
  flags: string[]
}

export async function listVerificationQueue(): Promise<VerificationUserDTO[]> {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      status: kycVerifications.status,
      riskLevel: kycVerifications.riskLevel,
      reviewedAt: kycVerifications.reviewedAt,
    })
    .from(kycVerifications)
    .innerJoin(users, eq(kycVerifications.userId, users.id))
    .orderBy(desc(kycVerifications.updatedAt))

  const flagRows = await db.select().from(riskFlags)
  const flagsByUser = new Map<string, string[]>()
  for (const f of flagRows) {
    const list = flagsByUser.get(f.userId) ?? []
    list.push(f.label)
    flagsByUser.set(f.userId, list)
  }

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    status: r.status as KycStatus,
    riskLevel: r.riskLevel as RiskLevel,
    createdAccountAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    flags: flagsByUser.get(r.userId) ?? [],
  }))
}
