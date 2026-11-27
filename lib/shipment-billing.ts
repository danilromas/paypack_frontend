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
  /** Billed to the shipper (cost + markup). */
  amount: number
  /** What the carrier charged PayPack. */
  carrierCost: number
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
  creditLimit: number | null
  markupPct: number
  /** Unbilled + invoiced (not yet paid), summed across currencies — what the credit limit is checked against. */
  outstanding: number
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

/** What a label is billed at: carrier cost plus markup (older rows without it bill at cost). */
const billed = sql<string>`coalesce(${shipments.billedAmount}, ${shipments.estimatedCost})`

export function applyMarkup(cost: number, markupPct: number): number {
  return round2(cost * (1 + Math.max(0, markupPct) / 100))
}

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
        amount: billed,
        carrierCost: shipments.estimatedCost,
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
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        canBookShipments: users.canBookShipments,
        creditLimit: users.shippingCreditLimit,
        markupPct: users.shippingMarkupPct,
      })
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
        total: sql<string>`sum(${billed})`,
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
        total: sql<string>`sum(${billed})`,
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
      creditLimit: u.creditLimit === null ? null : Number(u.creditLimit),
      markupPct: Number(u.markupPct),
      outstanding: 0,
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
    if (t.billingStatus !== "paid") summary.outstanding = round2(summary.outstanding + Number(t.total))
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
      carrierCost: Number(r.carrierCost),
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
  const terms = await getShipperTerms(userId)
  const rows = await db
    .select({
      billingStatus: shipments.billingStatus,
      currency: shipments.estimatedCurrency,
      total: sql<string>`sum(${billed})`,
    })
    .from(shipments)
    .where(and(eq(shipments.userId, userId), ne(shipments.billingStatus, "none")))
    .groupBy(shipments.billingStatus, shipments.estimatedCurrency)
  const totals: Record<BillingStatus, MoneyByCurrency> = { unbilled: {}, invoiced: {}, paid: {} }
  for (const r of rows) {
    const bucket = totals[r.billingStatus as BillingStatus]
    if (bucket) addMoney(bucket, r.currency, Number(r.total))
  }
  const outstanding = round2(
    [...Object.values(totals.unbilled), ...Object.values(totals.invoiced)].reduce((a, b) => a + b, 0),
  )
  return { totals, creditLimit: terms.creditLimit, outstanding }
}

export interface ShipperTerms {
  creditLimit: number | null
  markupPct: number
}

export async function getShipperTerms(userId: string): Promise<ShipperTerms> {
  const row = (
    await db
      .select({ creditLimit: users.shippingCreditLimit, markupPct: users.shippingMarkupPct })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0]
  return {
    creditLimit: row?.creditLimit == null ? null : Number(row.creditLimit),
    markupPct: row ? Number(row.markupPct) : 0,
  }
}

/** Unpaid (unbilled + invoiced) label total, all currencies summed — what the credit limit guards. */
export async function getOutstanding(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${billed}), 0)` })
    .from(shipments)
    .where(and(eq(shipments.userId, userId), inArray(shipments.billingStatus, ["unbilled", "invoiced"])))
  return Number(row.total)
}

export type CreditCheck = { ok: true; terms: ShipperTerms } | { ok: false; error: string }

/**
 * Refuses a booking that would push the shipper's unpaid labels past their credit limit. The price is
 * an estimate (the carrier's final price is only known after booking), so the limit can be overshot by
 * at most one label.
 */
export async function checkShipperCredit(userId: string, estimatedCharge: number): Promise<CreditCheck> {
  const terms = await getShipperTerms(userId)
  if (terms.creditLimit === null) return { ok: true, terms }
  const outstanding = await getOutstanding(userId)
  if (outstanding + estimatedCharge > terms.creditLimit) {
    return {
      ok: false,
      error:
        `This label would exceed your shipping credit limit of ${terms.creditLimit.toFixed(2)} EUR ` +
        `(${outstanding.toFixed(2)} EUR not yet paid). Pay your open invoice or contact PayPack to raise the limit.`,
    }
  }
  return { ok: true, terms }
}

/** Admin: set a shipper's credit limit (null = unlimited) and markup percentage. */
export async function updateShipperTerms(userId: string, terms: ShipperTerms): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      shippingCreditLimit: terms.creditLimit === null ? null : terms.creditLimit.toFixed(2),
      shippingMarkupPct: terms.markupPct.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  return rows.length > 0
}

/** Human-friendly invoice number: PP-SHIP-YYYYMMDD-XXXXXX. */
export function newInvoiceRef(now = new Date()): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "")
  return `PP-SHIP-${day}-${randomBytes(3).toString("hex").toUpperCase()}`
}

export type BillingActionResult =
  | { ok: true; invoiceRef: string; count: number; totals: MoneyByCurrency }
  | { ok: false; status: number; error: string }

function sumRows(rows: { amount: string; estimatedCurrency: string }[]): MoneyByCurrency {
  const totals: MoneyByCurrency = {}
  for (const r of rows) addMoney(totals, r.estimatedCurrency, Number(r.amount))
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
      .returning({ amount: billed, estimatedCurrency: shipments.estimatedCurrency })
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
        amount: billed,
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
    .returning({ amount: billed, estimatedCurrency: shipments.estimatedCurrency })
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
    ["invoice", "customer", "customer_email", "booked_on", "tracking", "carrier", "from", "to", "weight_kg", "carrier_cost", "amount", "currency", "status"],
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
      Number(s.billedAmount ?? s.estimatedCost).toFixed(2),
      s.estimatedCurrency,
      s.billingStatus,
    ]),
  )
}
