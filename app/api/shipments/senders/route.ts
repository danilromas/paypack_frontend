import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { normalizeSavedSenders, type SavedSender } from "@/lib/shipments"

/** The user's own sender addresses (up to five), default first. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  try {
    const [row] = await db
      .select({ book: users.senderAddressBook })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
    return NextResponse.json({ senders: sortDefaultFirst((row?.book ?? []) as SavedSender[]) })
  } catch (error) {
    console.error("GET /api/shipments/senders failed", error)
    return NextResponse.json({ error: "Failed to load your sender addresses" }, { status: 500 })
  }
}

/** Replaces the whole list — the wizard sends it back after adding, removing or re-defaulting one. */
export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const result = normalizeSavedSenders(body?.senders)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  try {
    await db
      .update(users)
      .set({ senderAddressBook: result.senders, updatedAt: new Date() })
      .where(eq(users.id, user.id))
    return NextResponse.json({ senders: sortDefaultFirst(result.senders) })
  } catch (error) {
    console.error("PUT /api/shipments/senders failed", error)
    return NextResponse.json({ error: "Failed to save your sender addresses" }, { status: 500 })
  }
}

function sortDefaultFirst(senders: SavedSender[]): SavedSender[] {
  return [...senders].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
}
