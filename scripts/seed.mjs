/**
 * Local-dev convenience seed: a demo user, a demo admin, and one demo deal.
 * Idempotent — safe to run on every `docker compose up`.
 * CLI: node --env-file=.env scripts/seed.mjs
 */
import { Pool } from "pg"
import bcrypt from "bcryptjs"

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

async function upsertUser({ email, password, name, role }) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email])
  if (existing.rows[0]) {
    console.log(`  - ${email} already exists, skipping`)
    return existing.rows[0].id
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const inserted = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, passwordHash, name, role],
  )
  console.log(`  - created ${email} / ${password} (role: ${role})`)
  return inserted.rows[0].id
}

async function main() {
  console.log("Seeding demo data...")

  const demoUserId = await upsertUser({
    email: "demo@paypack.uno",
    password: "password123",
    name: "Demo User",
    role: "user",
  })
  await upsertUser({
    email: "admin@paypack.uno",
    password: "password123",
    name: "Demo Admin",
    role: "admin",
  })

  const existingDeal = await pool.query("SELECT id FROM deals WHERE user_id = $1 LIMIT 1", [demoUserId])
  if (!existingDeal.rows[0]) {
    await pool.query(
      `INSERT INTO deals (user_id, title, description, price, shipping_price, currency, status, role, counterparty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [demoUserId, "Demo item — iPhone 15", "Seeded demo deal for local development", 650, 15, "EUR", "pending", "seller", "Awaiting counterparty"],
    )
    console.log("  - created a demo deal for demo@paypack.uno")
  } else {
    console.log("  - demo deal already exists, skipping")
  }

  // Backfill: any deal that predates deal_participants (or was inserted directly, like the one above)
  // needs its creator linked as a participant, or they'd be locked out once deal access became
  // participant-based instead of owner-based. Idempotent — safe to run on every boot.
  const backfilled = await pool.query(`
    INSERT INTO deal_participants (deal_id, user_id, role, joined_at)
    SELECT d.id, d.user_id, d.role, now()
    FROM deals d
    WHERE NOT EXISTS (
      SELECT 1 FROM deal_participants dp WHERE dp.deal_id = d.id AND dp.user_id = d.user_id
    )
    RETURNING deal_id
  `)
  if (backfilled.rowCount > 0) {
    console.log(`  - backfilled deal_participants for ${backfilled.rowCount} deal(s)`)
  }

  console.log("Done.")
  await pool.end()
}

main().catch((error) => {
  console.error("Seed failed:", error)
  process.exit(1)
})
