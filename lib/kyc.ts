import "server-only"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { kycDocuments, kycVerifications, riskFlags, users } from "@/db/schema"

export type KycStatus = "unverified" | "pending" | "approved" | "rejected"
export type RiskLevel = "low" | "medium" | "high"
export type KycDocType = "id" | "proof_of_address" | "selfie"

export interface KycDocumentDTO {
  id: string
  docType: KycDocType
  fileUrl: string
  reviewStatus: string
  createdAt: string
}

export interface VerificationUserDTO {
  userId: string
  name: string
  email: string
  status: KycStatus
  riskLevel: RiskLevel
  createdAccountAt: string
  reviewedAt: string | null
  flags: string[]
  documents: KycDocumentDTO[]
}

const DOC_TYPES: KycDocType[] = ["id", "proof_of_address", "selfie"]

export function normalizeDocuments(input: unknown): { docType: KycDocType; fileUrl: string }[] {
  if (!Array.isArray(input)) return []
  const out: { docType: KycDocType; fileUrl: string }[] = []
  for (const item of input) {
    if (
      item &&
      typeof item === "object" &&
      "docType" in item &&
      "fileUrl" in item &&
      DOC_TYPES.includes((item as { docType: unknown }).docType as KycDocType) &&
      typeof (item as { fileUrl: unknown }).fileUrl === "string" &&
      (item as { fileUrl: string }).fileUrl.trim()
    ) {
      out.push({
        docType: (item as { docType: KycDocType }).docType,
        fileUrl: (item as { fileUrl: string }).fileUrl.trim(),
      })
    }
  }
  return out.slice(0, 10)
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

  const docRows = await db.select().from(kycDocuments).orderBy(desc(kycDocuments.createdAt))
  const docsByUser = new Map<string, KycDocumentDTO[]>()
  for (const d of docRows) {
    const list = docsByUser.get(d.userId) ?? []
    list.push({
      id: d.id,
      docType: d.docType as KycDocType,
      fileUrl: d.fileUrl,
      reviewStatus: d.reviewStatus,
      createdAt: d.createdAt.toISOString(),
    })
    docsByUser.set(d.userId, list)
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
    documents: docsByUser.get(r.userId) ?? [],
  }))
}
