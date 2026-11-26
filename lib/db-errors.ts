/** Postgres unique_violation (23505), also when wrapped by drizzle in `cause`. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; current && depth < 3; depth++) {
    if (typeof current === "object" && (current as { code?: unknown }).code === "23505") return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}
