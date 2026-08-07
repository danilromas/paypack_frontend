import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "@/db/schema"

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Add your Postgres connection string to .env")
  }
  return databaseUrl
}

const databaseUrl = getDatabaseUrl()
const isRemoteHost = !/^(localhost|127\.0\.0\.1|db)$/.test(new URL(databaseUrl).hostname)

// sslmode/channel_binding query params are libpq-specific and trigger a deprecation
// warning when parsed by pg — strip them and drive SSL explicitly instead.
const cleanUrl = new URL(databaseUrl)
cleanUrl.searchParams.delete("sslmode")
cleanUrl.searchParams.delete("channel_binding")

const pool = new Pool({
  connectionString: cleanUrl.toString(),
  ssl: isRemoteHost ? { rejectUnauthorized: false } : false,
})

export const db = drizzle(pool, { schema })
