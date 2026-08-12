import "server-only"
import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"

// Edge-safe: no Node-only imports (no `pg`, no `lib/db`) so this can be imported
// from proxy.ts (Edge runtime) as well as from Node.js Route Handlers.

export const SESSION_COOKIE = "pp_session"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface SessionClaims {
  sub: string
  email: string
  name: string
  role: string
  sv: number
}

function getSecretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured. Add a random secret to .env")
  }
  return new TextEncoder().encode(secret)
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name, role: claims.role, sv: claims.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey())
}

/** Verifies signature/expiry only — does not check session_version against the DB. Safe for Edge middleware. */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (typeof payload.sub !== "string") return null
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? "user"),
      sv: typeof payload.sv === "number" ? payload.sv : 0,
    }
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  }
}
