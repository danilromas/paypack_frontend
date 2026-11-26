import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { isUuid } from "@/lib/ids"
import { createInvoice, getBillingOverview, invoiceCsv, markInvoicePaid, voidInvoice } from "@/lib/shipment-billing"

const INVOICE_REF_RE = /^PP-SHIP-\d{8}-[0-9A-F]{6}$/

async function requireAdmin() {
  const admin = await getCurrentUser()
  if (!admin) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  if (admin.role !== "admin") return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { admin }
}

/** Shipper accounts, their invoices and billable labels. `?invoice=<ref>&format=csv` exports one invoice. */
export async function GET(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  try {
    const params = new URL(req.url).searchParams
    const invoice = params.get("invoice")
    if (params.get("format") === "csv") {
      if (!invoice || !INVOICE_REF_RE.test(invoice)) {
        return NextResponse.json({ error: "Invalid invoice number" }, { status: 400 })
      }
      const csv = await invoiceCsv(invoice)
      if (!csv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      return new NextResponse("﻿" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${invoice}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    const userId = params.get("userId") ?? undefined
    if (userId && !isUuid(userId)) return NextResponse.json({ error: "Invalid user" }, { status: 400 })
    return NextResponse.json(await getBillingOverview({ userId, status: params.get("status") ?? undefined }))
  } catch (error) {
    console.error("GET /api/admin/shipping-billing failed", error)
    return NextResponse.json({ error: "Failed to load shipping billing" }, { status: 500 })
  }
}

/**
 * { action: "invoice", userId, shipmentIds? } — puts unbilled labels on a new invoice.
 * { action: "mark_paid" | "void", invoiceRef } — settles or cancels an open invoice.
 */
export async function POST(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: unknown
      userId?: unknown
      shipmentIds?: unknown
      invoiceRef?: unknown
    }

    let result
    if (body.action === "invoice") {
      if (!isUuid(body.userId)) return NextResponse.json({ error: "Invalid user" }, { status: 400 })
      const ids = Array.isArray(body.shipmentIds) ? body.shipmentIds.filter(isUuid) : undefined
      result = await createInvoice(body.userId, ids)
    } else if (body.action === "mark_paid" || body.action === "void") {
      if (typeof body.invoiceRef !== "string" || !INVOICE_REF_RE.test(body.invoiceRef)) {
        return NextResponse.json({ error: "Invalid invoice number" }, { status: 400 })
      }
      result = body.action === "mark_paid" ? await markInvoicePaid(body.invoiceRef) : await voidInvoice(body.invoiceRef)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/admin/shipping-billing failed", error)
    return NextResponse.json({ error: "Failed to update billing" }, { status: 500 })
  }
}
