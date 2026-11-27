"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Download, FileText, Loader2, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDealDateTime } from "@/lib/utils"
import type { BillingOverviewDTO, BillingStatus, MoneyByCurrency, ShipperSummaryDTO } from "@/lib/shipment-billing"

/** Credit limit + markup editor for one shipping account. */
function TermsForm({ shipper, onSaved }: { shipper: ShipperSummaryDTO; onSaved: (text: string) => void }) {
  const [limit, setLimit] = useState(shipper.creditLimit === null ? "" : String(shipper.creditLimit))
  const [markup, setMarkup] = useState(String(shipper.markupPct))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/shipping-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "terms",
          userId: shipper.userId,
          creditLimit: limit.trim() === "" ? null : Number(limit),
          markupPct: markup.trim() === "" ? 0 : Number(markup),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Could not save")
        return
      }
      onSaved(`Terms saved for ${shipper.name}.`)
    } catch {
      setError("Network error — try again")
    } finally {
      setSaving(false)
    }
  }

  const usedPct = shipper.creditLimit ? Math.min(100, (shipper.outstanding / shipper.creditLimit) * 100) : 0
  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-3">
      {shipper.creditLimit !== null ? (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Credit used</span>
            <span>
              {shipper.outstanding.toFixed(2)} / {shipper.creditLimit.toFixed(2)} EUR
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${usedPct >= 90 ? "bg-destructive" : usedPct >= 70 ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No credit limit — unpaid: {shipper.outstanding.toFixed(2)} EUR</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Credit limit, EUR
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="decimal"
            placeholder="No limit"
            className="mt-1 w-full rounded-lg border border-border bg-secondary px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Markup, %
          <input
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-border bg-secondary px-2 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button variant="outline" size="sm" className="w-full rounded-xl" disabled={saving} onClick={save}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save terms"}
      </Button>
      <p className="text-[11px] text-muted-foreground">Markup applies to labels booked from now on.</p>
    </div>
  )
}

function money(totals: MoneyByCurrency): string {
  const parts = Object.entries(totals).map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
  return parts.length ? parts.join(" + ") : "—"
}

const STATUS_BADGE: Record<BillingStatus, { text: string; className: string }> = {
  unbilled: { text: "UNBILLED", className: "bg-warning/10 text-warning" },
  invoiced: { text: "INVOICED", className: "bg-primary/10 text-primary" },
  paid: { text: "PAID", className: "bg-success/10 text-success" },
}

export default function AdminShippingBillingPage() {
  const [data, setData] = useState<BillingOverviewDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>("all")
  const [status, setStatus] = useState<BillingStatus | "all">("all")
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (userId !== "all") params.set("userId", userId)
      if (status !== "all") params.set("status", status)
      const res = await fetch(`/api/admin/shipping-billing?${params}`, { cache: "no-store" })
      setData(res.ok ? await res.json() : null)
    } finally {
      setLoading(false)
    }
  }, [userId, status])

  useEffect(() => {
    void load()
  }, [load])

  async function act(key: string, body: Record<string, unknown>, success: (r: { invoiceRef: string; count: number; totals: MoneyByCurrency }) => string) {
    setBusy(key)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/shipping-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ kind: "error", text: result.error ?? "Action failed" })
        return
      }
      setMessage({ kind: "ok", text: success(result) })
      await load()
    } catch {
      setMessage({ kind: "error", text: "Network error — try again" })
    } finally {
      setBusy(null)
    }
  }

  const shippers = data?.shippers ?? []
  const invoices = data?.invoices ?? []
  const labels = data?.shipments ?? []
  const shipperName = useMemo(() => new Map(shippers.map((s) => [s.userId, s.name])), [shippers])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Shipping billing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Labels booked by shipping accounts are paid by PayPack&apos;s carrier account and billed back here:
          put unbilled labels on an invoice, send the CSV with your invoice, then mark it paid. Turn an account into a
          shipping account under <Link href="/admin/users" className="text-primary hover:underline">Users</Link>.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            message.kind === "ok" ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Shipping accounts</h2>
        {shippers.length === 0 && !loading ? (
          <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
            No shipping accounts yet. Open a user under Users and choose &ldquo;Enable shipping account&rdquo;.
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shippers.map((s) => {
            const hasUnbilled = Object.keys(s.totals.unbilled).length > 0
            return (
              <Card key={s.userId} className="space-y-3 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.email}</div>
                  </div>
                  {s.canBookShipments ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Unbilled</dt>
                    <dd className="font-semibold">{money(s.totals.unbilled)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Invoiced</dt>
                    <dd className="font-semibold">{money(s.totals.invoiced)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="font-semibold">{money(s.totals.paid)}</dd>
                  </div>
                </dl>
                <TermsForm
                  key={`${s.userId}:${s.creditLimit}:${s.markupPct}`}
                  shipper={s}
                  onSaved={(text) => {
                    setMessage({ kind: "ok", text })
                    void load()
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-xl bg-primary"
                    disabled={!hasUnbilled || busy !== null}
                    onClick={() =>
                      act(`invoice:${s.userId}`, { action: "invoice", userId: s.userId }, (r) =>
                        `Invoice ${r.invoiceRef} created for ${s.name}: ${r.count} label(s), ${money(r.totals)}.`,
                      )
                    }
                  >
                    {busy === `invoice:${s.userId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invoice unbilled"}
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => setUserId(s.userId)}>
                    Labels
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-primary" /> Invoices
        </h2>
        <Card className="overflow-x-auto rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.invoiceRef}>
                    <TableCell className="font-mono text-xs">{inv.invoiceRef}</TableCell>
                    <TableCell>{inv.userName}</TableCell>
                    <TableCell>{inv.labelCount}</TableCell>
                    <TableCell className="font-semibold">{money(inv.totals)}</TableCell>
                    <TableCell className="text-xs">{inv.invoicedAt ? formatDealDateTime(inv.invoicedAt) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_BADGE[inv.status].className}>
                        {STATUS_BADGE[inv.status].text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <a href={`/api/admin/shipping-billing?format=csv&invoice=${encodeURIComponent(inv.invoiceRef)}`}>
                            <Download className="h-4 w-4" /> CSV
                          </a>
                        </Button>
                        {inv.status === "invoiced" ? (
                          <>
                            <Button
                              size="sm"
                              className="rounded-xl bg-primary"
                              disabled={busy !== null}
                              onClick={() =>
                                act(`paid:${inv.invoiceRef}`, { action: "mark_paid", invoiceRef: inv.invoiceRef }, (r) =>
                                  `Invoice ${r.invoiceRef} marked as paid.`,
                                )
                              }
                            >
                              Mark paid
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl"
                              disabled={busy !== null}
                              onClick={() => {
                                if (!window.confirm(`Void invoice ${inv.invoiceRef}? Its labels go back to unbilled.`)) return
                                void act(`void:${inv.invoiceRef}`, { action: "void", invoiceRef: inv.invoiceRef }, (r) =>
                                  `Invoice ${r.invoiceRef} voided — ${r.count} label(s) are unbilled again.`,
                                )
                              }}
                            >
                              Void
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5 text-primary" /> Labels
          </h2>
          <div className="flex gap-2">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
              aria-label="Filter by account"
            >
              <option value="all">All accounts</option>
              {shippers.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BillingStatus | "all")}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
              aria-label="Filter by billing status"
            >
              <option value="all">All statuses</option>
              <option value="unbilled">Unbilled</option>
              <option value="invoiced">Invoiced</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        <Card className="overflow-x-auto rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booked</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Billing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No billable labels{userId !== "all" ? ` for ${shipperName.get(userId) ?? "this account"}` : ""}.
                  </TableCell>
                </TableRow>
              ) : (
                labels.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{formatDealDateTime(l.createdAt)}</TableCell>
                    <TableCell>{l.userName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.trackingNumber}
                      {l.carrierName ? <div className="font-sans text-muted-foreground">{l.carrierName}</div> : null}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs" title={l.route}>
                      {l.route}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {l.amount.toFixed(2)} {l.currency}
                      {l.amount !== l.carrierCost ? (
                        <div className="text-[11px] font-normal text-muted-foreground">
                          carrier {l.carrierCost.toFixed(2)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_BADGE[l.billingStatus].className}>
                        {STATUS_BADGE[l.billingStatus].text}
                      </Badge>
                      {l.invoiceRef ? <div className="mt-1 font-mono text-[10px] text-muted-foreground">{l.invoiceRef}</div> : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  )
}
