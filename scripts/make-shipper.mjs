/**
 * Turns an existing user into a shipper account: they book carrier labels without the shared
 * booking password, and each label is recorded as "unbilled" so PayPack can invoice them for it
 * (Admin → Shipping billing). Pass --off to switch it back off.
 * CLI: npm run make-shipper -- someone@example.com [--off]
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

const result = await pool.query(
  `UPDATE users SET can_book_shipments = $2, updated_at = now() WHERE email = $1 RETURNING id, email`,
  [email, enable],
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

console.log(`${result.rows[0].email}: shipper account ${enable ? "enabled" : "disabled"}.`)
await pool.end()
