import "server-only"
import { randomBytes } from "node:crypto"
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments, users } from "@/db/schema"
import { notifyUser } from "@/lib/notifications"
import { toCsv } from "@/lib/admin-transactions"

/**
 * Invoicing for shipper accounts. PayPack's Sendcloud/Eurosender account pays every label; labels a
 * shipper account books are recorded as "unbilled" and PayPack invoices the account for them later
 * (unbilled → invoiced → paid). Amounts are the carrier price stored at booking.
 */
export type BillingStatus = "unbilled" | "invoiced" | "paid"
export const BILLING_STATUSES: BillingStatus[] = ["unbilled", "invoiced", "paid"]

export type MoneyByCurrency = Record<string, number>

export interface BillableShipmentDTO {
  id: string
  userId: string
  userName: string
  userEmail: string
  trackingNumber: string
  carrierName: string | null
  provider: string
  route: string
  status: string
  amount: number
  currency: string
  billingStatus: BillingStatus
  invoiceRef: string | null
  invoicedAt: string | null
  paidAt: string | null
  createdAt: string
}

export interface ShipperSummaryDTO {
  userId: string
  name: string
  email: string
  canBookShipments: boolean
  /** Totals per billing status, per currency (labels can be priced in more than one). */
  totals: Record<BillingStatus, MoneyByCurrency>
  labelCount: number
}

export interface InvoiceSummaryDTO {
  invoiceRef: string
  userId: string
  userName: string
  status: "invoiced" | "paid"
  labelCount: number
  totals: MoneyByCurrency
  invoicedAt: string | null
  paidAt: string | null
}

export interface BillingOverviewDTO {
  shippers: ShipperSummaryDTO[]
  invoices: InvoiceSummaryDTO[]
  shipments: BillableShipmentDTO[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

function addMoney(bucket: MoneyByCurrency, currency: string, amount: number) {
  bucket[currency] = round2((bucket[currency] ?? 0) + amount)
}

export function formatMoneyTotals(totals: MoneyByCurrency): string {
  const parts = Object.entries(totals).map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
  return parts.length ? parts.join(" + ") : "0.00"
}

/** Every shipper account, their invoices and billable labels (newest first). */
export async function getBillingOverview(filters: { userId?: string; status?: string }): Promise<BillingOverviewDTO> {
  const conditions = [ne(shipments.billingStatus, "none")]
  if (filters.userId) conditions.push(eq(shipments.userId, filters.userId))
  if (BILLING_STATUSES.includes(filters.status as BillingStatus)) {
    conditions.push(eq(shipments.billingStatus, filters.status as BillingStatus))
  }

  const [rows, shipperRows, totalRows, invoiceRows] = await Promise.all([
    db
      .select({
        id: shipments.id,
        userId: shipments.userId,
        userName: users.name,
        userEmail: users.email,
        trackingNumber: shipments.trackingNumber,
        carrierName: shipments.carrierName,
        provider: shipments.provider,
        senderLocation: shipments.senderLocation,
        receiverLocation: shipments.receiverLocation,
        status: shipments.status,
        amount: shipments.estimatedCost,
        currency: shipments.estimatedCurrency,
        billingStatus: shipments.billingStatus,
        invoiceRef: shipments.invoiceRef,
        invoicedAt: shipments.invoicedAt,
        paidAt: shipments.paidAt,
        createdAt: shipments.createdAt,
      })
      .from(shipments)
      .innerJoin(users, eq(users.id, shipments.userId))
      .where(and(...conditions))
      .orderBy(desc(shipments.createdAt))
      .limit(1000),
    db
      .select({ id: users.id, name: users.name, email: users.email, canBookShipments: users.canBookShipments })
      .from(users)
      .where(
        sql`${users.canBookShipments} = true OR EXISTS (SELECT 1 FROM shipments s WHERE s.user_id = ${users.id} AND s.billing_status <> 'none')`,
      )
      .orderBy(users.name),
    // Totals come from a full aggregate, not from the filtered/limited list above.
    db
      .select({
        userId: shipments.userId,
        billingStatus: shipments.billingStatus,
        currency: shipments.estimatedCurrency,
        total: sql<string>`sum(${shipments.estimatedCost})`,
        count: sql<number>`count(*)::int`,
      })
      .from(shipments)
      .where(ne(shipments.billingStatus, "none"))
      .groupBy(shipments.userId, shipments.billingStatus, shipments.estimatedCurrency),
    db
      .select({
        invoiceRef: shipments.invoiceRef,
        userId: shipments.userId,
        userName: users.name,
        billingStatus: shipments.billingStatus,
        currency: shipments.estimatedCurrency,
        total: sql<string>`sum(${shipments.estimatedCost})`,
        count: sql<number>`count(*)::int`,
        invoicedAt: sql<Date | null>`max(${shipments.invoicedAt})`,
        paidAt: sql<Date | null>`max(${shipments.paidAt})`,
      })
      .from(shipments)
      .innerJoin(users, eq(users.id, shipments.userId))
      .where(sql`${shipments.invoiceRef} IS NOT NULL`)
      .groupBy(shipments.invoiceRef, shipments.userId, users.name, shipments.billingStatus, shipments.estimatedCurrency),
  ])

  const summaries = new Map<string, ShipperSummaryDTO>()
  for (const u of shipperRows) {
    summaries.set(u.id, {
      userId: u.id,
      name: u.name,
      email: u.email,
      canBookShipments: u.canBookShipments,
      totals: { unbilled: {}, invoiced: {}, paid: {} },
      labelCount: 0,
    })
  }
  for (const t of totalRows) {
    const summary = summaries.get(t.userId)
    const bucket = summary?.totals[t.billingStatus as BillingStatus]
    if (!summary || !bucket) continue
    addMoney(bucket, t.currency, Number(t.total))
    summary.labelCount += Number(t.count)
  }

  const invoices = new Map<string, InvoiceSummaryDTO>()
  for (const r of invoiceRows) {
    if (!r.invoiceRef) continue
    const invoice = invoices.get(r.invoiceRef) ?? {
      invoiceRef: r.invoiceRef,
      userId: r.userId,
      userName: r.userName,
      status: "paid" as const,
      labelCount: 0,
      totals: {},
      invoicedAt: null,
      paidAt: null,
    }
    // An invoice is paid only once every label on it is.
    if (r.billingStatus === "invoiced") invoice.status = "invoiced"
    invoice.labelCount += Number(r.count)
    addMoney(invoice.totals, r.currency, Number(r.total))
    const invoicedAt = r.invoicedAt ? new Date(r.invoicedAt).toISOString() : null
    const paidAt = r.paidAt ? new Date(r.paidAt).toISOString() : null
    if (invoicedAt && (!invoice.invoicedAt || invoicedAt > invoice.invoicedAt)) invoice.invoicedAt = invoicedAt
    if (paidAt && (!invoice.paidAt || paidAt > invoice.paidAt)) invoice.paidAt = paidAt
    invoices.set(r.invoiceRef, invoice)
  }

  return {
    shippers: [...summaries.values()],
    invoices: [...invoices.values()]
      .filter((i) => !filters.userId || i.userId === filters.userId)
      .sort((a, b) => (b.invoicedAt ?? "").localeCompare(a.invoicedAt ?? "")),
    shipments: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      trackingNumber: r.trackingNumber,
      carrierName: r.carrierName,
      provider: r.provider,
      route: `${r.senderLocation} → ${r.receiverLocation}`,
      status: r.status,
      amount: Number(r.amount),
      currency: r.currency,
      billingStatus: r.billingStatus as BillingStatus,
      invoiceRef: r.invoiceRef,
      invoicedAt: r.invoicedAt?.toISOString() ?? null,
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

/** The shipper's own view: what they owe PayPack for labels, and their open invoices. */
export async function getShipperBalance(userId: string) {
  const rows = await db
    .select({
      billingStatus: shipments.billingStatus,
      currency: shipments.estimatedCurrency,
      total: sql<string>`sum(${shipments.estimatedCost})`,
    })
    .from(shipments)
    .where(and(eq(shipments.userId, userId), ne(shipments.billingStatus, "none")))
    .groupBy(shipments.billingStatus, shipments.estimatedCurrency)
  const totals: Record<BillingStatus, MoneyByCurrency> = { unbilled: {}, invoiced: {}, paid: {} }
  for (const r of rows) {
    const bucket = totals[r.billingStatus as BillingStatus]
    if (bucket) addMoney(bucket, r.currency, Number(r.total))
  }
  return totals
}

/** Human-friendly invoice number: PP-SHIP-YYYYMMDD-XXXXXX. */
export function newInvoiceRef(now = new Date()): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "")
  return `PP-SHIP-${day}-${randomBytes(3).toString("hex").toUpperCase()}`
}

export type BillingActionResult =
  | { ok: true; invoiceRef: string; count: number; totals: MoneyByCurrency }
  | { ok: false; status: number; error: string }

function sumRows(rows: { estimatedCost: string; estimatedCurrency: string }[]): MoneyByCurrency {
  const totals: MoneyByCurrency = {}
  for (const r of rows) addMoney(totals, r.estimatedCurrency, Number(r.estimatedCost))
  return totals
}

/** Puts a shipper's unbilled labels (all of them, or the given ones) on one new invoice and tells them. */
export async function createInvoice(userId: string, shipmentIds?: string[]): Promise<BillingActionResult> {
  const invoiceRef = newInvoiceRef()
  return db.transaction(async (tx) => {
    const conditions = [eq(shipments.userId, userId), eq(shipments.billingStatus, "unbilled")]
    if (shipmentIds?.length) conditions.push(inArray(shipments.id, shipmentIds))
    const rows = await tx
      .update(shipments)
      .set({ billingStatus: "invoiced", invoiceRef, invoicedAt: new Date() })
      .where(and(...conditions))
      .returning({ estimatedCost: shipments.estimatedCost, estimatedCurrency: shipments.estimatedCurrency })
    if (rows.length === 0) {
      return { ok: false, status: 409, error: "Nothing unbilled to invoice for this account" } as const
    }

    const totals = sumRows(rows)
    await notifyUser(tx, {
      userId,
      type: "wallet",
      title: `New shipping invoice ${invoiceRef}`,
      description: `${rows.length} label${rows.length === 1 ? "" : "s"} — ${formatMoneyTotals(totals)} to pay to PayPack`,
      relatedHref: "/dashboard/shipments/",
    })
    return { ok: true, invoiceRef, count: rows.length, totals } as const
  })
}

/** Marks every label on an invoice as paid and tells the shipper. */
export async function markInvoicePaid(invoiceRef: string): Promise<BillingActionResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(shipments)
      .set({ billingStatus: "paid", paidAt: new Date() })
      .where(and(eq(shipments.invoiceRef, invoiceRef), eq(shipments.billingStatus, "invoiced")))
      .returning({
        userId: shipments.userId,
        estimatedCost: shipments.estimatedCost,
        estimatedCurrency: shipments.estimatedCurrency,
      })
    if (rows.length === 0) return { ok: false, status: 409, error: "No open invoice with that number" } as const

    const totals = sumRows(rows)
    await notifyUser(tx, {
      userId: rows[0].userId,
      type: "wallet",
      title: `Invoice ${invoiceRef} marked as paid`,
      description: `Thank you — ${formatMoneyTotals(totals)} received.`,
      relatedHref: "/dashboard/shipments/",
    })
    return { ok: true, invoiceRef, count: rows.length, totals } as const
  })
}

/** Cancels an unpaid invoice: its labels go back to unbilled so they can be invoiced again. */
export async function voidInvoice(invoiceRef: string): Promise<BillingActionResult> {
  const rows = await db
    .update(shipments)
    .set({ billingStatus: "unbilled", invoiceRef: null, invoicedAt: null })
    .where(and(eq(shipments.invoiceRef, invoiceRef), eq(shipments.billingStatus, "invoiced")))
    .returning({ estimatedCost: shipments.estimatedCost, estimatedCurrency: shipments.estimatedCurrency })
  if (rows.length === 0) return { ok: false, status: 409, error: "No open invoice with that number" }
  return { ok: true, invoiceRef, count: rows.length, totals: sumRows(rows) }
}

/** CSV of every label on one invoice — attach it to the invoice sent to the shipper. */
export async function invoiceCsv(invoiceRef: string): Promise<string | null> {
  const rows = await db
    .select({ s: shipments, userName: users.name, userEmail: users.email })
    .from(shipments)
    .innerJoin(users, eq(users.id, shipments.userId))
    .where(eq(shipments.invoiceRef, invoiceRef))
    .orderBy(shipments.createdAt)
  if (rows.length === 0) return null
  return toCsv(
    ["invoice", "customer", "customer_email", "booked_on", "tracking", "carrier", "from", "to", "weight_kg", "amount", "currency", "status"],
    rows.map(({ s, userName, userEmail }) => [
      invoiceRef,
      userName,
      userEmail,
      s.createdAt.toISOString().slice(0, 10),
      s.trackingNumber,
      s.carrierName,
      s.senderLocation,
      s.receiverLocation,
      Number(s.weightKg),
      Number(s.estimatedCost).toFixed(2),
      s.estimatedCurrency,
      s.billingStatus,
    ]),
  )
}
