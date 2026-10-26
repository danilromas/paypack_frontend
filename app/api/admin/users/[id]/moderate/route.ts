import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { MODERATION_ACTIONS, moderateUser, type ModerationAction } from "@/lib/admin-users"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser()
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as { action?: unknown; reason?: unknown }
    const action = body.action as ModerationAction
    if (!MODERATION_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : ""

    const result = await moderateUser(admin.id, id, action, reason)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/admin/users/[id]/moderate failed", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
