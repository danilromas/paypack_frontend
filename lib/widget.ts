import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { dealParticipants, deals, users } from "@/db/schema"
import { validateDealCreatePayload } from "@/lib/deals"
import { ensureCreatorParticipant } from "@/lib/deals-access"
import { notifyUser } from "@/lib/notifications"
import { getPublicProfile } from "@/lib/ratings"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CURRENCIES = ["EUR", "USD", "GBP"]

/** What the embeddable widget passes to the checkout page (all from the partner's page markup). */
export interface WidgetCheckoutPayload {
  sellerId: string
  title: string
  description: string
  price: number
  shippingPrice: number
  currency: string
  imageUrl: string | null
  sourceUrl: string | null
}

export interface WidgetSellerDTO {
  id: string
  name: string
  kycStatus: string
  ratingAverage: number | null
  ratingCount: number
  completedDealsCount: number
}

function httpUrlOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 2000) : null
  } catch {
    return null
  }
}

export function normalizeWidgetPayload(body: Record<string, unknown>): WidgetCheckoutPayload {
  return {
    sellerId: typeof body.sellerId === "string" ? body.sellerId.trim() : "",
    title: typeof body.title === "string" ? body.title.trim().slice(0, 200) : "",
    description: typeof body.description === "string" ? body.description.slice(0, 2000) : "",
    price: Number(body.price),
    shippingPrice: body.shippingPrice === undefined || body.shippingPrice === "" ? 0 : Number(body.shippingPrice),
    currency: typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "EUR",
    imageUrl: httpUrlOrNull(body.imageUrl),
    sourceUrl: httpUrlOrNull(body.sourceUrl),
  }
}

export function validateWidgetPayload(p: WidgetCheckoutPayload): string | null {
  if (!UUID_RE.test(p.sellerId)) return "Invalid seller"
  if (!CURRENCIES.includes(p.currency)) return "Unsupported currency"
  if (!(p.price > 0)) return "Invalid price"
  return validateDealCreatePayload({ ...p, role: "buyer", counterparty: "" })
}

/** Public, unauthenticated seller card shown on the checkout page before the buyer signs in. */
export async function getWidgetSeller(sellerId: string): Promise<WidgetSellerDTO | null> {
  if (!UUID_RE.test(sellerId)) return null
  const status = (await db.select({ status: users.status }).from(users).where(eq(users.id, sellerId)).limit(1))[0]
  if (!status || status.status !== "active") return null
  const profile = await getPublicProfile(sellerId)
  if (!profile) return null
  return {
    id: profile.id,
    name: profile.name,
    kycStatus: profile.kycStatus,
    ratingAverage: profile.ratingAverage,
    ratingCount: profile.ratingCount,
    completedDealsCount: profile.completedDealsCount,
  }
}

export type WidgetCheckoutResult = { ok: true; dealId: string } | { ok: false; status: number; error: string }

/**
 * Creates a pending deal with the signed-in user as buyer and the widget owner already attached as
 * seller. Amounts come from the partner page and can be edited by the buyer, so they aren't trusted
 * blindly: the seller sees the deal's amount before shipping and can cancel it (refunding the buyer).
 */
export async function createWidgetDeal(buyerUserId: string, p: WidgetCheckoutPayload): Promise<WidgetCheckoutResult> {
  if (p.sellerId === buyerUserId) {
    return { ok: false, status: 400, error: "You can't buy from yourself" }
  }
  const seller = (await db.select().from(users).where(eq(users.id, p.sellerId)).limit(1))[0]
  if (!seller || seller.status !== "active") {
    return { ok: false, status: 404, error: "This seller can't accept payments right now" }
  }

  const dealId = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(deals)
      .values({
        userId: buyerUserId,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        price: (Math.round(p.price * 100) / 100).toFixed(2),
        shippingPrice: (Math.round(p.shippingPrice * 100) / 100).toFixed(2),
        currency: p.currency,
        status: "pending",
        role: "buyer",
        counterparty: seller.name,
        sourceUrl: p.sourceUrl,
        sourcePlatform: "widget",
      })
      .returning({ id: deals.id })
    const id = inserted[0].id

    await ensureCreatorParticipant(tx, { id, role: "buyer" }, buyerUserId)
    await tx.insert(dealParticipants).values({ dealId: id, userId: seller.id, role: "seller", joinedAt: new Date() })
    await notifyUser(tx, {
      userId: seller.id,
      type: "deal",
      title: `New order via your PayPack button: "${p.title}"`,
      relatedHref: `/dashboard/deals/?deal=${id}`,
    })
    return id
  })

  return { ok: true, dealId }
}
