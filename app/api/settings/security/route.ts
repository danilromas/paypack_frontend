import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as {
      loginAlertsEnabled?: unknown
      requireWithdrawalConfirmation?: unknown
    }

    const patch: Partial<{ loginAlertsEnabled: boolean; requireWithdrawalConfirmation: boolean }> = {}
    if (typeof body.loginAlertsEnabled === "boolean") patch.loginAlertsEnabled = body.loginAlertsEnabled
    if (typeof body.requireWithdrawalConfirmation === "boolean") {
      patch.requireWithdrawalConfirmation = body.requireWithdrawalConfirmation
    }

    const rows = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning({
        loginAlertsEnabled: users.loginAlertsEnabled,
        requireWithdrawalConfirmation: users.requireWithdrawalConfirmation,
      })

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error("PATCH /api/settings/security failed", error)
    return NextResponse.json({ error: "Failed to update security settings" }, { status: 500 })
  }
}
