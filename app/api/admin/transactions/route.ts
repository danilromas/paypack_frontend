import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import {
  ADMIN_EXPORT_LIMIT,
  dealsToCsv,
  listDealsForAdmin,
  listWalletTransactionsForAdmin,
  walletToCsv,
  type AdminTransactionFilters,
} from "@/lib/admin-transactions"

/**
 * Admin view over every deal or wallet ledger entry, with filters.
 * `?kind=deals|wallet`, `?format=csv` downloads the whole filtered set (capped) instead of one page.
 */
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
    const kind = params.get("kind") === "wallet" ? "wallet" : "deals"
    const csv = params.get("format") === "csv"
    const filters: AdminTransactionFilters = {
      q: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
      type: params.get("type") ?? undefined,
      currency: params.get("currency") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      page: csv ? 1 : Number(params.get("page") ?? 1) || 1,
    }

    if (csv) {
      const body =
        kind === "wallet"
          ? walletToCsv((await listWalletTransactionsForAdmin(filters, ADMIN_EXPORT_LIMIT)).rows)
          : dealsToCsv((await listDealsForAdmin(filters, ADMIN_EXPORT_LIMIT)).rows)
      const stamp = new Date().toISOString().slice(0, 10)
      return new NextResponse("﻿" + body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="paypack-${kind}-${stamp}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    const page = kind === "wallet" ? await listWalletTransactionsForAdmin(filters) : await listDealsForAdmin(filters)
    return NextResponse.json(page)
  } catch (error) {
    console.error("GET /api/admin/transactions failed", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
