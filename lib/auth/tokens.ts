import "server-only"
import { randomBytes, createHash } from "node:crypto"

/** Returns { raw, hash } — raw goes in the emailed link, only the hash is stored in the DB. */
export function createResetToken() {
  const raw = randomBytes(32).toString("base64url")
  const hash = createHash("sha256").update(raw).digest("hex")
  return { raw, hash }
}

export function hashResetToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex")
}
