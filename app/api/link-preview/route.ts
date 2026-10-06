import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { fetchLinkPreview, LinkPreviewError } from "@/lib/link-preview"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const url = new URL(req.url).searchParams.get("url")?.trim()
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  try {
    return NextResponse.json(await fetchLinkPreview(url))
  } catch (error) {
    if (error instanceof LinkPreviewError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error("GET /api/link-preview failed", error)
    return NextResponse.json({ error: "The listing page couldn't be loaded" }, { status: 502 })
  }
}
