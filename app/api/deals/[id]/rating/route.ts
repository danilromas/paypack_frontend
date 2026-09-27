import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, ratings } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { getParticipantRole, getOtherParticipantUserId, getDealForViewer } from "@/lib/deals-access"
import { validateRatingPayload } from "@/lib/ratings"
import { notifyUser } from "@/lib/notifications"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const role = await getParticipantRole(id, user.id)
    if (!role) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const body = (await req.json()) as { score?: unknown; comment?: unknown }
    const comment = typeof body.comment === "string" ? body.comment.trim() || null : null
    const validationError = validateRatingPayload(body.score, comment ?? undefined)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const dealRows = await db.select().from(deals).where(eq(deals.id, id)).limit(1)
    const deal = dealRows[0]
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }
    if (deal.status !== "completed") {
      return NextResponse.json({ error: "You can only rate a completed deal" }, { status: 409 })
    }

    const ratedUserId = await getOtherParticipantUserId(id, user.id)
    if (!ratedUserId) {
      return NextResponse.json({ error: "The other side hasn't joined this deal" }, { status: 409 })
    }

    const existing = await db
      .select({ id: ratings.id })
      .from(ratings)
      .where(and(eq(ratings.dealId, id), eq(ratings.raterUserId, user.id)))
      .limit(1)
    if (existing[0]) {
      return NextResponse.json({ error: "You already rated this deal" }, { status: 409 })
    }

    const rating = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(ratings)
        .values({
          dealId: id,
          raterUserId: user.id,
          ratedUserId,
          score: body.score as number,
          comment,
        })
        .returning()

      await notifyUser(tx, {
        userId: ratedUserId,
        type: "deal",
        title: "You received a new rating",
        description: `${user.name} rated your deal "${deal.title}"`,
        relatedHref: `/dashboard/users/${user.id}`,
      })

      return inserted[0]
    })

    return NextResponse.json(
      { rating, deal: await getDealForViewer(id, user.id) },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST /api/deals/[id]/rating failed", error)
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 })
  }
}
