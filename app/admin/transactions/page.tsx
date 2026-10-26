"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Download, Loader2, Search } from "lucide-react"
import { cn, formatDealDateTime } from "@/lib/utils"
import type {
  AdminDealRow,
  AdminTransactionKind,
  AdminTransactionPage,
  AdminWalletRow,
} from "@/lib/admin-transactions"

const DEAL_STATUSES = ["pending", "escrow", "shipped", "completed", "disputed", "cancelled"]
const WALLET_TYPES = ["topup", "withdrawal", "payout", "escrow_hold", "refund"]
const WALLET_STATUSES = ["pending", "processing", "completed", "failed"]

const statusClass: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  processing: "bg-warning/10 text-warning",
  escrow: "bg-primary/10 text-primary",
  shipped: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  disputed: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-secondary text-secondary-foreground",
}

const selectClass =
  "rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"

function money(amount: number, currency = "EUR") {
  return `${amount.toFixed(2)} ${currency}`
}

export default function AdminTransactionsPage() {
  const [kind, setKind] = useState<AdminTransactionKind>("deals")
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminTransactionPage<AdminDealRow | AdminWalletRow> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  // Any filter change goes back to the first page.
  useEffect(() => {
    setPage(1)
  }, [kind, debouncedQ, status, type, from, to])

  const params = useMemo(() => {
    const p = new URLSearchParams({ kind })
    if (debouncedQ.trim()) p.set("q", debouncedQ.trim())
    if (status) p.set("status", status)
    if (kind === "wallet" && type) p.set("type", type)
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return p
  }, [kind, debouncedQ, status, type, from, to])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const p = new URLSearchParams(params)
    p.set("page", String(page))
    fetch(`/api/admin/transactions?${p}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [params, page])

  const exportHref = useMemo(() => {
    const p = new URLSearchParams(params)
    p.set("format", "csv")
    return `/api/admin/transactions?${p}`
  }, [params])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  function switchKind(next: AdminTransactionKind) {
    setKind(next)
    setStatus("")
    setType("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Transactions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every deal and wallet ledger entry on the platform. Export applies the current filters.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <a href={exportHref} download>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="inline-flex rounded-2xl border border-border bg-card p-1">
        {(["deals", "wallet"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => switchKind(k)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {k === "deals" ? "Deals" : "Wallet ledger"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={kind === "deals" ? "Search title, deal ID, buyer or seller..." : "Search user, description or deal ID..."}
            className="w-full rounded-2xl border border-border bg-card px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label="Status">
          <option value="">All statuses</option>
          {(kind === "deals" ? DEAL_STATUSES : WALLET_STATUSES).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {kind === "wallet" ? (
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass} aria-label="Type">
            <option value="">All types</option>
            {WALLET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        ) : (
          <span className="hidden xl:block" />
        )}
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} aria-label="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label="To date" />
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : !data || data.rows.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card/60 p-8 text-center text-sm text-muted-foreground shadow-sm">
          Nothing matches these filters.
        </Card>
      ) : (
        <Card className={cn("overflow-x-auto rounded-2xl border-border bg-card/60 p-0 shadow-sm", loading && "opacity-60")}>
          {kind === "deals" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.rows as AdminDealRow[]).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="max-w-64">
                      <div className="truncate text-sm font-semibold">{d.title}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">{d.id}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{d.buyerName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{d.buyerEmail ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{d.sellerName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{d.sellerEmail ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("uppercase", statusClass[d.status])}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                      {money(d.price + d.shippingPrice, d.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDealDateTime(d.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.rows as AdminWalletRow[]).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{t.userName}</div>
                      <div className="text-xs text-muted-foreground">{t.userEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{t.type.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("uppercase", statusClass[t.status])}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">{money(t.amount)}</TableCell>
                    <TableCell className="max-w-72 text-xs text-muted-foreground">
                      <div className="truncate">{t.description || "—"}</div>
                      {t.relatedDealId ? <div className="truncate font-mono">{t.relatedDealId}</div> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDealDateTime(t.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {data && data.total > 0 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} {data.total === 1 ? "record" : "records"} • page {data.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
