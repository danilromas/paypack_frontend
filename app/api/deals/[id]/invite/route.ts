import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { deals, dealParticipants, chatThreads, users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

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

    const counterpartyRole = deal.role === "buyer" ? "seller" : "buyer"

    const result = await db.transaction(async (tx) => {
      const ownerRows = await tx
        .select({ id: dealParticipants.id })
        .from(dealParticipants)
        .where(and(eq(dealParticipants.dealId, deal.id), eq(dealParticipants.userId, user.id)))
        .limit(1)
      if (!ownerRows[0]) {
        await tx.insert(dealParticipants).values({
          dealId: deal.id,
          userId: user.id,
          role: deal.role,
          joinedAt: new Date(),
        })
      }

      const counterpartyUserRows = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      const counterpartyUser = counterpartyUserRows[0]

      const existingParticipant = counterpartyUser
        ? (
            await tx
              .select({ id: dealParticipants.id })
              .from(dealParticipants)
              .where(and(eq(dealParticipants.dealId, deal.id), eq(dealParticipants.userId, counterpartyUser.id)))
              .limit(1)
          )[0]
        : (
            await tx
              .select({ id: dealParticipants.id })
              .from(dealParticipants)
              .where(and(eq(dealParticipants.dealId, deal.id), eq(dealParticipants.invitedEmail, email)))
              .limit(1)
          )[0]

      if (!existingParticipant) {
        await tx.insert(dealParticipants).values(
          counterpartyUser
            ? { dealId: deal.id, userId: counterpartyUser.id, role: counterpartyRole, joinedAt: new Date() }
            : { dealId: deal.id, invitedEmail: email, role: counterpartyRole },
        )
      }

      const threadRows = await tx.select().from(chatThreads).where(eq(chatThreads.dealId, deal.id)).limit(1)
      const thread = threadRows[0] ?? (await tx.insert(chatThreads).values({ dealId: deal.id }).returning())[0]

      return { threadId: thread.id, joined: Boolean(counterpartyUser) }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/deals/[id]/invite failed", error)
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 })
  }
}
