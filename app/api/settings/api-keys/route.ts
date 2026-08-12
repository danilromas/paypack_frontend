import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiKeys } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { generateApiKey, type ApiKeyEnvironment } from "@/lib/settings"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { label?: unknown; environment?: unknown }
    const environment: ApiKeyEnvironment = body.environment === "live" ? "live" : "test"
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : `${environment} key`

    const { raw, hash, preview } = generateApiKey(environment)

    const inserted = await db
      .insert(apiKeys)
      .values({ userId: user.id, label, keyHash: hash, keyPreview: preview, environment })
      .returning()

    // The raw key is only ever returned here — it's not recoverable afterward.
    return NextResponse.json({ ...inserted[0], rawKey: raw }, { status: 201 })
  } catch (error) {
    console.error("POST /api/settings/api-keys failed", error)
    return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 })
  }
}
