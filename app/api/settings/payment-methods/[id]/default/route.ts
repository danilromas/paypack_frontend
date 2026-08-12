import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { paymentMethods } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: paymentMethods.id })
        .from(paymentMethods)
        .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)))
        .limit(1)
      if (!rows[0]) return null

      await tx.update(paymentMethods).set({ isDefault: false }).where(eq(paymentMethods.userId, user.id))
      await tx.update(paymentMethods).set({ isDefault: true }).where(eq(paymentMethods.id, id))
      return true
    })

    if (!updated) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/settings/payment-methods/[id]/default failed", error)
    return NextResponse.json({ error: "Failed to set default payment method" }, { status: 500 })
  }
}
