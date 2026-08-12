import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { paymentMethods } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const rows = await db
      .delete(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, user.id)))
      .returning({ id: paymentMethods.id })

    if (!rows[0]) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/settings/payment-methods/[id] failed", error)
    return NextResponse.json({ error: "Failed to remove payment method" }, { status: 500 })
  }
}
