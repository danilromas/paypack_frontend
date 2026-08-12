import "server-only"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt"

export {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  signSession,
  verifySessionToken,
  sessionCookieOptions,
  type SessionClaims,
} from "@/lib/auth/jwt"

export interface SessionUser {
  id: string
  email: string
  name: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  role: string
}

/**
 * Authoritative check used by Route Handlers (Node.js runtime): verifies the JWT *and*
 * confirms its session_version still matches the DB row, so a password change invalidates
 * old tokens without needing a server-side session table. Not Edge-safe — do not import
 * this from proxy.ts; use `verifySessionToken` from `lib/auth/jwt` there instead.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const claims = await verifySessionToken(token)
  if (!claims) return null

  const rows = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1)
  const user = rows[0]
  if (!user || user.sessionVersion !== claims.sv) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
  }
}
