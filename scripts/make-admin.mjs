/**
 * Promotes an existing user to role='admin'. There's intentionally no self-serve
 * way to become admin from the app itself.
 * CLI: node --env-file=.env scripts/make-admin.mjs someone@example.com
 */
import { Pool } from "pg"

const email = process.argv[2]
if (!email) {
  console.error("Usage: npm run make-admin -- <email>")
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
  `UPDATE users SET role = 'admin', updated_at = now() WHERE email = $1 RETURNING id, email, role`,
  [email],
)

if (!result.rows[0]) {
  console.error(`No user found with email ${email}`)
  process.exit(1)
}

console.log(`${result.rows[0].email} is now an admin.`)
await pool.end()
