import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { paymentMethods } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { validatePaymentMethod } from "@/lib/settings"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    const validationError = validatePaymentMethod(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const existing = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, user.id))
      .limit(1)

    const inserted = await db
      .insert(paymentMethods)
      .values({
        userId: user.id,
        kind: body.kind as string,
        brand: typeof body.brand === "string" ? body.brand.trim() : null,
        last4: typeof body.last4 === "string" ? body.last4 : null,
        holderName: typeof body.holderName === "string" ? body.holderName.trim() : null,
        expiry: typeof body.expiry === "string" ? body.expiry.trim() : null,
        bankName: typeof body.bankName === "string" ? body.bankName.trim() : null,
        isDefault: existing.length === 0,
      })
      .returning()

    return NextResponse.json(inserted[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/settings/payment-methods failed", error)
    return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 })
  }
}
