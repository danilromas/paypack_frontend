process.env.SESSION_SECRET = "test-secret-at-least-32-bytes-long-for-hs256"

import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword, signSession, verifySessionToken } from "../lib/auth/jwt"

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct-horse-battery-staple")
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true)
    expect(await verifyPassword("wrong-password", hash)).toBe(false)
  })

  it("never stores the password itself in the hash", async () => {
    const hash = await hashPassword("my-secret-password")
    expect(hash).not.toContain("my-secret-password")
  })
})

describe("session tokens", () => {
  it("round-trips claims through sign + verify", async () => {
    const token = await signSession({ sub: "user-1", email: "a@b.com", name: "A", role: "user", sv: 0 })
    const claims = await verifySessionToken(token)
    expect(claims).toMatchObject({ sub: "user-1", email: "a@b.com", name: "A", role: "user", sv: 0 })
  })

  it("rejects a tampered token", async () => {
    const token = await signSession({ sub: "user-1", email: "a@b.com", name: "A", role: "user", sv: 0 })
    const tampered = token.slice(0, -2) + "xx"
    expect(await verifySessionToken(tampered)).toBeNull()
  })

  it("rejects garbage input", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull()
  })
})
