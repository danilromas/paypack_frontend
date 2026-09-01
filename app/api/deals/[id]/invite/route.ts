import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { deals } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { ensureParticipantsAndThread } from "@/lib/deals-access"

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
})

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const raw = await req.json()
    const parsed = inviteSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }
    const { email } = parsed.data

    if (email === user.email) {
      return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 })
    }

    const dealRows = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.userId, user.id)))
      .limit(1)
    const deal = dealRows[0]
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const result = await db.transaction((tx) =>
      ensureParticipantsAndThread(tx, { id: deal.id, role: deal.role as "buyer" | "seller" }, user.id, email),
    )

    return NextResponse.json({ threadId: result.threadId, joined: result.counterpartyJoined }, { status: 201 })
  } catch (error) {
    console.error("POST /api/deals/[id]/invite failed", error)
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 })
  }
}
