import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import { needsCustoms } from "@/lib/shipments"
import { SendcloudError, documentUrl, fetchDocumentPdf, type ParcelDocument } from "@/lib/sendcloud"

/**
 * Streams a Sendcloud label PDF to its owner — Sendcloud's document links need our API credentials.
 * `?doc=customs-declaration` returns the customs documents of a shipment leaving the EU instead.
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
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

  const doc: ParcelDocument = new URL(req.url).searchParams.get("doc") === "customs-declaration" ? "customs-declaration" : "label"
  if (doc === "customs-declaration" && !needsCustoms(shipment.receiverAddress?.country)) {
    return NextResponse.json({ error: "This shipment has no customs documents" }, { status: 404 })
  }

  try {
    const pdf = await fetchDocumentPdf(documentUrl(shipment.labelUrl, doc))
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc === "label" ? "label" : "customs"}-${shipment.trackingNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    if (error instanceof SendcloudError) {
      // Sendcloud has no customs document for services that don't need one (e.g. its free test letter).
      if (error.status === 404) {
        return NextResponse.json({ error: "The carrier has no such document for this shipment" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error("GET /api/shipments/[id]/label failed", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}
