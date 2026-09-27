import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import type { KycStatus } from "@/lib/kyc"

export interface RecentReviewDTO {
  raterName: string
  score: number
  comment: string | null
  createdAt: string
}

export interface PublicProfileDTO {
  id: string
  name: string
  avatarUrl: string | null
  memberSince: string
  kycStatus: KycStatus
  completedDealsCount: number
  ratingAverage: number | null
  ratingCount: number
  recentReviews: RecentReviewDTO[]
}

export function validateRatingPayload(score: unknown, comment: unknown): string | null {
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
    return "Rating must be a whole number from 1 to 5"
  }
  if (comment !== undefined && comment !== null && typeof comment !== "string") {
    return "Invalid comment"
  }
  if (typeof comment === "string" && comment.length > 1000) {
    return "Comment is too long"
  }
  return null
}

/** Public, counterparty-facing profile — name/avatar/KYC/rating/completed-deals only, never email or phone. */
export async function getPublicProfile(userId: string): Promise<PublicProfileDTO | null> {
  const userRows = await db.execute(sql`
    SELECT u.id, u.name, u.avatar_url AS "avatarUrl", u.created_at AS "createdAt",
      coalesce(k.status, 'unverified') AS "kycStatus"
    FROM users u
    LEFT JOIN kyc_verifications k ON k.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  `)
  const userRow = userRows.rows[0] as
    | { id: string; name: string; avatarUrl: string | null; createdAt: string; kycStatus: string }
    | undefined
  if (!userRow) return null

  const completedRows = await db.execute(sql`
    SELECT count(*) AS "count"
    FROM deal_participants dp
    JOIN deals d ON d.id = dp.deal_id
    WHERE dp.user_id = ${userId} AND d.status = 'completed'
  `)
  const completedDealsCount = Number((completedRows.rows[0] as { count: string }).count)

  const summaryRows = await db.execute(sql`
    SELECT avg(score) AS "average", count(*) AS "count"
    FROM ratings
    WHERE rated_user_id = ${userId}
  `)
  const summaryRow = summaryRows.rows[0] as { average: string | null; count: string }
  const ratingCount = Number(summaryRow.count)
  const ratingAverage = summaryRow.average != null ? Number(summaryRow.average) : null

  const reviewRows = await db.execute(sql`
    SELECT u.name AS "raterName", r.score, r.comment, r.created_at AS "createdAt"
    FROM ratings r
    JOIN users u ON u.id = r.rater_user_id
    WHERE r.rated_user_id = ${userId}
    ORDER BY r.created_at DESC
    LIMIT 5
  `)
  const recentReviews = (
    reviewRows.rows as { raterName: string; score: number; comment: string | null; createdAt: string }[]
  ).map((r) => ({
    raterName: r.raterName,
    score: r.score,
    comment: r.comment,
    createdAt: new Date(r.createdAt).toISOString(),
  }))

  return {
    id: userRow.id,
    name: userRow.name,
    avatarUrl: userRow.avatarUrl,
    memberSince: new Date(userRow.createdAt).toISOString(),
    kycStatus: userRow.kycStatus as KycStatus,
    completedDealsCount,
    ratingAverage,
    ratingCount,
    recentReviews,
  }
}
