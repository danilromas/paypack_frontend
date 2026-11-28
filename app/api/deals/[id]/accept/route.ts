import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deals, walletTransactions } from "@/db/schema"
import { getCurrentUser, restrictionError } from "@/lib/auth/session"
import { getParticipantRole, getOtherParticipantUserId, getDealForViewer } from "@/lib/deals-access"
import { getAvailableBalance, lockWallet } from "@/lib/wallet"
import { notifyOtherParticipants } from "@/lib/notifications"
import { CRYPTO_COINS, PAYMENT_METHODS } from "@/lib/payments"
import { parseDeliveryAddress, validateDeliveryAddress } from "@/lib/deals"
import { logDealEvent } from "@/lib/deal-events"

/** Buyer accepts the deal and pays its price+shipping into escrow — a real, immediate ledger deduction. */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const restricted = restrictionError(user)
  if (restricted) {
    return NextResponse.json(restricted, { status: 403 })
  }

  try {
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    // The buyer picks how they pay at this step (not at deal creation) — recorded on the deal.
    const body = (await req.json().catch(() => ({}))) as {
      paymentMethod?: unknown
      paymentCryptoCoin?: unknown
      expectedAmount?: unknown
      delivery?: unknown
    }
    // The seller needs to know where to ship, so the buyer gives the address as they pay.
    const delivery = parseDeliveryAddress(body.delivery)
    const deliveryError = validateDeliveryAddress(delivery)
    if (deliveryError || !delivery) {
      return NextResponse.json({ error: deliveryError ?? "Add a delivery address" }, { status: 400 })
    }
    const expectedAmount =
      typeof body.expectedAmount === "number" && Number.isFinite(body.expectedAmount) ? body.expectedAmount : null
    const paymentMethod = PAYMENT_METHODS.find((m) => m.value === body.paymentMethod)?.value ?? null
    const paymentCryptoCoin =
      paymentMethod === "crypto" ? (CRYPTO_COINS.find((c) => c.value === body.paymentCryptoCoin)?.value ?? null) : null
    if (body.paymentMethod !== undefined && !paymentMethod) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    const role = await getParticipantRole(id, user.id)
    if (role !== "buyer") {
      return NextResponse.json({ error: "Only the buyer can accept and pay into escrow" }, { status: 403 })
    }

    const dealRows = await db.select().from(deals).where(eq(deals.id, id)).limit(1)
    const deal = dealRows[0]
    if (!deal || deal.status !== "pending") {
      return NextResponse.json(
        { error: "Deal isn't awaiting acceptance (already accepted, cancelled, or not found)" },
        { status: 409 },
      )
    }

    const otherParticipantId = await getOtherParticipantUserId(id, user.id)
    if (!otherParticipantId) {
      return NextResponse.json(
        { error: "The seller hasn't joined this deal yet — wait for them before paying into escrow" },
        { status: 409 },
      )
    }

    const amount = Number(deal.price) + Number(deal.shippingPrice)
    // The buyer confirms the amount they saw; if the terms moved since, make them look again.
    if (expectedAmount !== null && Math.abs(expectedAmount - amount) > 0.004) {
      return NextResponse.json(
        { error: `The deal amount changed to ${amount.toFixed(2)} ${deal.currency} — review it before paying` },
        { status: 409 },
      )
    }

    const updated = await db.transaction(async (tx) => {
      // Balance check and hold happen under the buyer's wallet lock, in one transaction.
      await lockWallet(tx, user.id)
      const available = await getAvailableBalance(tx, user.id)
      if (available < amount) return { shortBy: amount - available } as const

      const rows = await tx
        .update(deals)
        .set({
          status: "escrow",
          paidAt: new Date(),
          updatedAt: new Date(),
          deliveryName: delivery.name,
          deliveryPhone: delivery.phone || null,
          deliveryStreet: delivery.street,
          deliveryCity: delivery.city,
          deliveryPostcode: delivery.postcode,
          deliveryCountry: delivery.country,
          deliveryNote: delivery.note || null,
          ...(paymentMethod ? { paymentMethod, paymentCryptoCoin } : {}),
        })
        .where(
          and(
            eq(deals.id, id),
            eq(deals.status, "pending"),
            // Pay exactly the amount checked above, even if an edit landed in between.
            eq(deals.price, deal.price),
            eq(deals.shippingPrice, deal.shippingPrice),
          ),
        )
        .returning()
      const dealRow = rows[0]
      if (!dealRow) return null

      await tx.insert(walletTransactions).values({
        userId: user.id,
        type: "escrow_hold",
        amount: (-amount).toFixed(2),
        status: "completed",
        relatedDealId: dealRow.id,
        description: `Escrow hold for "${dealRow.title}"`,
      })

      await logDealEvent(tx, {
        dealId: dealRow.id,
        actorUserId: user.id,
        type: "paid",
        message: `Paid ${amount.toFixed(2)} ${dealRow.currency} into escrow`,
      })

      await notifyOtherParticipants(tx, dealRow.id, user.id, {
        type: "deal",
        title: `"${dealRow.title}" is now in escrow`,
        description: `The buyer paid — ship to ${delivery.city}, ${delivery.country}.`,
        relatedHref: "/dashboard/deals",
      })

      return dealRow
    })

    if (updated && "shortBy" in updated) {
      return NextResponse.json(
        { error: `Insufficient balance — top up at least ${updated.shortBy.toFixed(2)} ${deal.currency} first` },
        { status: 400 },
      )
    }
    if (!updated) {
      return NextResponse.json(
        { error: "Deal isn't awaiting acceptance (already accepted, cancelled, or not found)" },
        { status: 409 },
      )
    }

    return NextResponse.json(await getDealForViewer(id, user.id))
  } catch (error) {
    console.error("POST /api/deals/[id]/accept failed", error)
    return NextResponse.json({ error: "Failed to accept deal" }, { status: 500 })
  }
}
