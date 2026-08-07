import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { profileUpdateSchema } from "@/lib/auth/schemas"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  return NextResponse.json(user)
}

export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const raw = await req.json()
  const parsed = profileUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }

  const updated = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning()

  const row = updated[0]
  return NextResponse.json({
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    role: row.role,
  })
}
