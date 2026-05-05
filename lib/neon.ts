import { neon } from "@neondatabase/serverless"

let shipmentsTableEnsured = false
let dealsTableEnsured = false

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Add your Neon connection string to .env.local")
  }
  return neon(databaseUrl)
}

export async function ensureShipmentsTable() {
  if (shipmentsTableEnsured) return
  const sql = getSqlClient()

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`

  await sql`
    CREATE TABLE IF NOT EXISTS shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_name TEXT NOT NULL,
      sender_location TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      receiver_location TEXT NOT NULL,
      service TEXT NOT NULL,
      dimensions TEXT NOT NULL,
      weight TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('arrived', 'in-transit', 'pending')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  shipmentsTableEnsured = true
}

export async function ensureDealsTable() {
  if (dealsTableEnsured) return
  const sql = getSqlClient()

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`

  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      images_json TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      shipping_price INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL CHECK (
        status IN (
          'pending', 'escrow', 'shipped', 'in-transit',
          'delivered', 'completed', 'disputed', 'cancelled'
        )
      ),
      role TEXT NOT NULL CHECK (role IN ('buyer', 'seller')),
      counterparty TEXT NOT NULL DEFAULT '',
      counterparty_avatar TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS deals_created_at_idx ON deals (created_at DESC)
  `

  await sql`
    ALTER TABLE deals
    ADD COLUMN IF NOT EXISTS image_url TEXT
  `

  await sql`
    ALTER TABLE deals
    ADD COLUMN IF NOT EXISTS images_json TEXT NOT NULL DEFAULT ''
  `

  dealsTableEnsured = true
}

export function getSql() {
  return getSqlClient()
}
