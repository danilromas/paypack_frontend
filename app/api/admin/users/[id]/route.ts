import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { listModerationEvents } from "@/lib/admin-users"

/** Moderation history (role changes and sanctions) for one user. */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser()
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await context.params
    return NextResponse.json({ events: await listModerationEvents(id) })
  } catch (error) {
    console.error("GET /api/admin/users/[id] failed", error)
    return NextResponse.json({ error: "Failed to fetch user history" }, { status: 500 })
  }
}
