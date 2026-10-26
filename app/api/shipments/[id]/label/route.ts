import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { SendcloudError, fetchLabelPdf } from "@/lib/sendcloud"

/** Streams a Sendcloud label PDF to its owner — Sendcloud's document links need our API credentials. */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await context.params
  const rows = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.userId, user.id)))
    .limit(1)
  const shipment = rows[0]
  if (!shipment || shipment.provider !== "sendcloud" || !shipment.labelUrl) {
    return NextResponse.json({ error: "Label not found" }, { status: 404 })
  }

  try {
    const pdf = await fetchLabelPdf(shipment.labelUrl)
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="label-${shipment.trackingNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    if (error instanceof SendcloudError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error("GET /api/shipments/[id]/label failed", error)
    return NextResponse.json({ error: "Failed to fetch label" }, { status: 500 })
  }
}
