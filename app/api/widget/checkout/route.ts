import { NextResponse } from "next/server"
import { getCurrentUser, restrictionError } from "@/lib/auth/session"
import { rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { createWidgetDeal, normalizeWidgetPayload, validateWidgetPayload } from "@/lib/widget"

/** Called by the /checkout page that the embeddable widget opens: buyer confirms, a pending deal is created. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const restricted = restrictionError(user)
  if (restricted) {
    return NextResponse.json(restricted, { status: 403 })
  }

  // Each checkout notifies the seller — cap it so nobody can spam a seller with fake orders.
  const limit = rateLimit(`widget-checkout:${user.id}`, 20, 60 * 60 * 1000)
  if (!limit.ok) return tooManyRequests(limit)

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const payload = normalizeWidgetPayload(body)
    const validationError = validateWidgetPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const result = await createWidgetDeal(user.id, payload)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ dealId: result.dealId }, { status: 201 })
  } catch (error) {
    console.error("POST /api/widget/checkout failed", error)
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 })
  }
}
