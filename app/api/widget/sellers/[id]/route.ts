import { NextResponse } from "next/server"
import { isUuid } from "@/lib/ids"
import { getWidgetSeller } from "@/lib/widget"

/** Public seller card for the widget checkout page — no auth, no contact details. */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const seller = await getWidgetSeller(id)
    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 })
    }
    return NextResponse.json(seller)
  } catch (error) {
    console.error("GET /api/widget/sellers/[id] failed", error)
    return NextResponse.json({ error: "Failed to load seller" }, { status: 500 })
  }
}
