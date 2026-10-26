import "server-only"
import { sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { DEAL_STATUS_VALUES } from "@/lib/deals"

export type AdminTransactionKind = "deals" | "wallet"

export interface AdminTransactionFilters {
  q?: string
  status?: string
  type?: string
  currency?: string
  from?: string
  to?: string
  page?: number
}

export interface AdminDealRow {
  id: string
  title: string
  status: string
  price: number
  shippingPrice: number
  currency: string
  paymentMethod: string | null
  buyerName: string | null
  buyerEmail: string | null
  sellerName: string | null
  sellerEmail: string | null
  createdAt: string
}

export interface AdminWalletRow {
  id: string
  type: string
  status: string
  amount: number
  userName: string
  userEmail: string
  relatedDealId: string | null
  description: string
  createdAt: string
}

export interface AdminTransactionPage<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export const ADMIN_PAGE_SIZE = 50
/** Upper bound for a single CSV export so one request can't pull the whole database into memory. */
export const ADMIN_EXPORT_LIMIT = 10_000

const WALLET_TYPES = ["topup", "withdrawal", "payout", "escrow_hold", "refund"]
const WALLET_STATUSES = ["pending", "processing", "completed", "failed"]

function likePattern(q: string) {
  return `%${q.replace(/[%_\\]/g, "\\$&")}%`
}

/** Parses a yyyy-mm-dd date; `endOfDay` makes the "to" bound inclusive. */
function parseDate(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay) d.setUTCDate(d.getUTCDate() + 1)
  return d
}

function joinWhere(conditions: SQL[]): SQL {
  return conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``
}

function dealConditions(f: AdminTransactionFilters): SQL[] {
  const c: SQL[] = []
  if (f.status && (DEAL_STATUS_VALUES as string[]).includes(f.status)) c.push(sql`d.status = ${f.status}`)
  if (f.currency && /^[A-Z]{3}$/.test(f.currency)) c.push(sql`d.currency = ${f.currency}`)
  const from = parseDate(f.from, false)
  const to = parseDate(f.to, true)
  if (from) c.push(sql`d.created_at >= ${from.toISOString()}`)
  if (to) c.push(sql`d.created_at < ${to.toISOString()}`)
  const q = f.q?.trim()
  if (q) {
    const p = likePattern(q)
    c.push(sql`(
      d.title ILIKE ${p} OR d.id::text ILIKE ${p}
      OR buyer.name ILIKE ${p} OR buyer.email ILIKE ${p}
      OR seller.name ILIKE ${p} OR seller.email ILIKE ${p}
    )`)
  }
  return c
}

const DEAL_FROM = sql`
  FROM deals d
  LEFT JOIN deal_participants bp ON bp.deal_id = d.id AND bp.role = 'buyer' AND bp.user_id IS NOT NULL
  LEFT JOIN users buyer ON buyer.id = bp.user_id
  LEFT JOIN deal_participants sp ON sp.deal_id = d.id AND sp.role = 'seller' AND sp.user_id IS NOT NULL
  LEFT JOIN users seller ON seller.id = sp.user_id
`

export async function listDealsForAdmin(
  f: AdminTransactionFilters,
  limit = ADMIN_PAGE_SIZE,
): Promise<AdminTransactionPage<AdminDealRow>> {
  const page = Math.max(1, Math.floor(f.page ?? 1))
  const where = joinWhere(dealConditions(f))
  const [rows, count] = await Promise.all([
    db.execute(sql`
      SELECT d.id, d.title, d.status, d.price, d.shipping_price, d.currency, d.payment_method, d.created_at,
             buyer.name AS buyer_name, buyer.email AS buyer_email,
             seller.name AS seller_name, seller.email AS seller_email
      ${DEAL_FROM} ${where}
      ORDER BY d.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `),
    db.execute(sql`SELECT count(*)::int AS total ${DEAL_FROM} ${where}`),
  ])

  return {
    rows: (rows.rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      title: String(r.title),
      status: String(r.status),
      price: Number(r.price),
      shippingPrice: Number(r.shipping_price),
      currency: String(r.currency),
      paymentMethod: (r.payment_method as string | null) ?? null,
      buyerName: (r.buyer_name as string | null) ?? null,
      buyerEmail: (r.buyer_email as string | null) ?? null,
      sellerName: (r.seller_name as string | null) ?? null,
      sellerEmail: (r.seller_email as string | null) ?? null,
      createdAt: new Date(r.created_at as string).toISOString(),
    })),
    total: Number((count.rows[0] as { total: number }).total),
    page,
    pageSize: limit,
  }
}

function walletConditions(f: AdminTransactionFilters): SQL[] {
  const c: SQL[] = []
  if (f.type && WALLET_TYPES.includes(f.type)) c.push(sql`t.type = ${f.type}`)
  if (f.status && WALLET_STATUSES.includes(f.status)) c.push(sql`t.status = ${f.status}`)
  const from = parseDate(f.from, false)
  const to = parseDate(f.to, true)
  if (from) c.push(sql`t.created_at >= ${from.toISOString()}`)
  if (to) c.push(sql`t.created_at < ${to.toISOString()}`)
  const q = f.q?.trim()
  if (q) {
    const p = likePattern(q)
    c.push(sql`(u.name ILIKE ${p} OR u.email ILIKE ${p} OR t.description ILIKE ${p} OR t.related_deal_id::text ILIKE ${p})`)
  }
  return c
}

export async function listWalletTransactionsForAdmin(
  f: AdminTransactionFilters,
  limit = ADMIN_PAGE_SIZE,
): Promise<AdminTransactionPage<AdminWalletRow>> {
  const page = Math.max(1, Math.floor(f.page ?? 1))
  const where = joinWhere(walletConditions(f))
  const from = sql`FROM wallet_transactions t JOIN users u ON u.id = t.user_id`
  const [rows, count] = await Promise.all([
    db.execute(sql`
      SELECT t.id, t.type, t.status, t.amount, t.related_deal_id, t.description, t.created_at,
             u.name AS user_name, u.email AS user_email
      ${from} ${where}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `),
    db.execute(sql`SELECT count(*)::int AS total ${from} ${where}`),
  ])

  return {
    rows: (rows.rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      type: String(r.type),
      status: String(r.status),
      amount: Number(r.amount),
      userName: String(r.user_name),
      userEmail: String(r.user_email),
      relatedDealId: (r.related_deal_id as string | null) ?? null,
      description: String(r.description ?? ""),
      createdAt: new Date(r.created_at as string).toISOString(),
    })),
    total: Number((count.rows[0] as { total: number }).total),
    page,
    pageSize: limit,
  }
}

/** RFC 4180 CSV, with a guard against spreadsheet formula injection in user-supplied text. */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    if (v === null || v === undefined) return ""
    let s = String(v)
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n"
}

export function dealsToCsv(rows: AdminDealRow[]): string {
  return toCsv(
    ["id", "created_at", "title", "status", "price", "shipping_price", "currency", "payment_method", "buyer_name", "buyer_email", "seller_name", "seller_email"],
    rows.map((r) => [r.id, r.createdAt, r.title, r.status, r.price, r.shippingPrice, r.currency, r.paymentMethod, r.buyerName, r.buyerEmail, r.sellerName, r.sellerEmail]),
  )
}

export function walletToCsv(rows: AdminWalletRow[]): string {
  return toCsv(
    ["id", "created_at", "type", "status", "amount", "user_name", "user_email", "related_deal_id", "description"],
    rows.map((r) => [r.id, r.createdAt, r.type, r.status, r.amount, r.userName, r.userEmail, r.relatedDealId, r.description]),
  )
}
