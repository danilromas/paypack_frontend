/**
 * Turns an existing user into a shipper account: they book carrier labels without the shared
 * booking password, and each label is recorded as "unbilled" so PayPack can invoice them for it
 * (Admin → Shipping billing). Pass --off to switch it back off.
 * CLI: npm run make-shipper -- someone@example.com [--off] [--limit=200|none]
 */
import { Pool } from "pg"

const email = process.argv[2]?.trim().toLowerCase()
const enable = !process.argv.includes("--off")
if (!email) {
  console.error("Usage: npm run make-shipper -- <email> [--off]")
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is missing.")
  process.exit(1)
}

const parsed = new URL(url)
parsed.searchParams.delete("sslmode")
parsed.searchParams.delete("channel_binding")
const isRemoteHost = !/^(localhost|127\.0\.0\.1|db)$/.test(parsed.hostname)

const pool = new Pool({
  connectionString: parsed.toString(),
  ssl: isRemoteHost ? { rejectUnauthorized: false } : false,
})

// --limit=200 sets the credit limit in EUR (--limit=none removes it); without it the limit is unchanged.
const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.slice("--limit=".length)
const limit = limitArg === undefined ? undefined : limitArg === "none" ? null : Number(limitArg)
if (limit !== undefined && limit !== null && !(Number.isFinite(limit) && limit >= 0)) {
  console.error("--limit must be a number of EUR or 'none'")
  process.exit(1)
}

const result = await pool.query(
  limit === undefined
    ? `UPDATE users SET can_book_shipments = $2, updated_at = now() WHERE lower(email) = $1 RETURNING id, email, shipping_credit_limit`
    : `UPDATE users SET can_book_shipments = $2, shipping_credit_limit = $3, updated_at = now() WHERE lower(email) = $1 RETURNING id, email, shipping_credit_limit`,
  limit === undefined ? [email, enable] : [email, enable, limit],
)

if (!result.rows[0]) {
  console.error(`No user found with email ${email}`)
  await pool.end()
  process.exit(1)
}

await pool.query(
  `INSERT INTO user_moderation_events (user_id, action, reason) VALUES ($1, $2, 'via scripts/make-shipper.mjs')`,
  [result.rows[0].id, enable ? "enable_shipping" : "disable_shipping"],
)

const limitText = result.rows[0].shipping_credit_limit === null ? "no credit limit" : `credit limit ${result.rows[0].shipping_credit_limit} EUR`
console.log(`${result.rows[0].email}: shipper account ${enable ? "enabled" : "disabled"} (${limitText}).`)
await pool.end()
