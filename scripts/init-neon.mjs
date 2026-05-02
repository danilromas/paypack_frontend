/**
 * One-off init: creates extension + shipments table in Neon (same as ../init.sql).
 * CLI: node --env-file=.env.local scripts/init-neon.mjs
 * Or paste init.sql in Neon → SQL Editor (no Node needed).
 */
import { neon } from "@neondatabase/serverless"

const url = process.env.DATABASE_URL
if (!url || typeof url !== "string") {
  console.error("DATABASE_URL is missing. Add it to .env.local")
  process.exit(1)
}

if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
  console.error("DATABASE_URL must start with postgresql:// or postgres:// (check for typos like ppostgresql://)")
  process.exit(1)
}

const sql = neon(url)

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

await sql`
  CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
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

console.log("Neon DB ready: pgcrypto + shipments + deals.")
