import "server-only"
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealParticipants, kycVerifications, userModerationEvents, users } from "@/db/schema"
import { notifyUser } from "@/lib/notifications"
import type { KycStatus } from "@/lib/kyc"
import type { UserStatus } from "@/lib/auth/session"

export const MODERATION_ACTIONS = ["restrict", "suspend", "reinstate", "make_admin", "remove_admin"] as const
export type ModerationAction = (typeof MODERATION_ACTIONS)[number]

export interface AdminUserDTO {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  status: UserStatus
  statusReason: string | null
  kycStatus: KycStatus
  dealsCount: number
  createdAt: string
}

export interface ModerationEventDTO {
  id: string
  action: ModerationAction
  reason: string
  adminName: string | null
  createdAt: string
}

export interface AdminUserFilters {
  q?: string
  role?: string
  status?: string
}

export async function listUsersForAdmin(filters: AdminUserFilters): Promise<AdminUserDTO[]> {
  const conditions: SQL[] = []
  const q = filters.q?.trim()
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`
    conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern))!)
  }
  if (filters.role === "user" || filters.role === "admin") conditions.push(eq(users.role, filters.role))
  if (filters.status === "active" || filters.status === "restricted" || filters.status === "suspended") {
    conditions.push(eq(users.status, filters.status))
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      statusReason: users.statusReason,
      createdAt: users.createdAt,
      kycStatus: kycVerifications.status,
      dealsCount: sql<number>`(select count(*)::int from ${dealParticipants} where ${dealParticipants.userId} = ${users.id})`,
    })
    .from(users)
    .leftJoin(kycVerifications, eq(kycVerifications.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(500)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role as AdminUserDTO["role"],
    status: r.status as UserStatus,
    statusReason: r.statusReason,
    kycStatus: (r.kycStatus ?? "unverified") as KycStatus,
    dealsCount: Number(r.dealsCount),
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function listModerationEvents(userId: string): Promise<ModerationEventDTO[]> {
  const rows = await db
    .select({
      id: userModerationEvents.id,
      action: userModerationEvents.action,
      reason: userModerationEvents.reason,
      adminName: users.name,
      createdAt: userModerationEvents.createdAt,
    })
    .from(userModerationEvents)
    .leftJoin(users, eq(users.id, userModerationEvents.adminUserId))
    .where(eq(userModerationEvents.userId, userId))
    .orderBy(desc(userModerationEvents.createdAt))
    .limit(50)

  return rows.map((r) => ({
    id: r.id,
    action: r.action as ModerationAction,
    reason: r.reason,
    adminName: r.adminName,
    createdAt: r.createdAt.toISOString(),
  }))
}

const NOTIFICATION_TITLES: Record<ModerationAction, string> = {
  restrict: "Your account has been restricted",
  suspend: "Your account has been suspended",
  reinstate: "Your account access has been restored",
  make_admin: "You were granted admin access",
  remove_admin: "Your admin access was removed",
}

export type ModerateResult = { ok: true } | { ok: false; status: number; error: string }

/**
 * Applies a role change or sanction and records it in the audit trail. Suspensions and role changes
 * bump session_version so existing JWTs (which carry the role) stop working immediately.
 */
export async function moderateUser(
  adminUserId: string,
  targetUserId: string,
  action: ModerationAction,
  reason: string,
): Promise<ModerateResult> {
  if (adminUserId === targetUserId) {
    return { ok: false, status: 400, error: "You can't change your own account" }
  }
  if ((action === "restrict" || action === "suspend") && !reason.trim()) {
    return { ok: false, status: 400, error: "A reason is required for sanctions" }
  }

  return db.transaction(async (tx) => {
    const target = (await tx.select().from(users).where(eq(users.id, targetUserId)).limit(1))[0]
    if (!target) return { ok: false, status: 404, error: "User not found" } as const

    const bumpSession = { sessionVersion: target.sessionVersion + 1 }
    switch (action) {
      case "restrict":
        await tx.update(users).set({ status: "restricted", statusReason: reason.trim(), updatedAt: new Date() }).where(eq(users.id, target.id))
        break
      case "suspend":
        await tx.update(users).set({ status: "suspended", statusReason: reason.trim(), ...bumpSession, updatedAt: new Date() }).where(eq(users.id, target.id))
        break
      case "reinstate":
        await tx.update(users).set({ status: "active", statusReason: null, updatedAt: new Date() }).where(eq(users.id, target.id))
        break
      case "make_admin":
        await tx.update(users).set({ role: "admin", ...bumpSession, updatedAt: new Date() }).where(eq(users.id, target.id))
        break
      case "remove_admin":
        await tx.update(users).set({ role: "user", ...bumpSession, updatedAt: new Date() }).where(eq(users.id, target.id))
        break
    }

    await tx.insert(userModerationEvents).values({
      userId: target.id,
      adminUserId,
      action,
      reason: reason.trim(),
    })

    await notifyUser(tx, {
      userId: target.id,
      type: "security",
      title: NOTIFICATION_TITLES[action],
      description: reason.trim(),
      relatedHref: "/dashboard/settings/",
    })

    return { ok: true } as const
  })
}
