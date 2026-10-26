import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { listUsersForAdmin } from "@/lib/admin-users"

export async function GET(req: Request) {
  const admin = await getCurrentUser()
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const params = new URL(req.url).searchParams
    const rows = await listUsersForAdmin({
      q: params.get("q") ?? undefined,
      role: params.get("role") ?? undefined,
      status: params.get("status") ?? undefined,
    })
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET /api/admin/users failed", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
