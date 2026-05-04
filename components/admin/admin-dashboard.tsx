"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Scale,
  ShieldCheck,
  Clock,
  PackageCheck,
  Truck,
  Eye,
  Loader2,
} from "lucide-react"
import type { Deal } from "@/types"
import type { Shipment } from "@/lib/shipments"

function formatMoneyEUR(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents)
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase()
}

export function AdminDashboard() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dealModal, setDealModal] = useState<Deal | null>(null)
  const [shipmentModal, setShipmentModal] = useState<Shipment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dealsRes, shipRes] = await Promise.all([
        fetch("/api/deals", { cache: "no-store" }),
        fetch("/api/shipments", { cache: "no-store" }),
      ])
      if (!dealsRes.ok) throw new Error("Could not load deals")
      if (!shipRes.ok) throw new Error("Could not load shipments")
      const d = (await dealsRes.json()) as Deal[]
      const s = (await shipRes.json()) as Shipment[]
      setDeals(Array.isArray(d) ? d : [])
      setShipments(Array.isArray(s) ? s : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data")
      setDeals([])
      setShipments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const disputed = deals.filter((x) => x.status === "disputed").length
    const pendingDeals = deals.filter((x) => x.status === "pending").length
    const activePipeline = deals.filter((x) =>
      ["escrow", "shipped", "in-transit", "delivered"].includes(x.status),
    ).length
    const escrowHeld = deals
      .filter((x) => x.status === "escrow")
      .reduce((sum, x) => sum + x.price, 0)
    const inTransitShipments = shipments.filter((x) => x.status === "in-transit").length

    return {
      disputed,
      pendingDeals,
      activePipeline,
      escrowHeld,
      inTransitShipments,
    }
  }, [deals, shipments])

  const disputedDeals = useMemo(
    () =>
      [...deals]
        .filter((d) => d.status === "disputed")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [deals],
  )

  const recentDeals = useMemo(
    () =>
      [...deals].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [deals],
  )

  const recentShipments = useMemo(
    () =>
      [...shipments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [shipments],
  )

  const cards = [
    {
      title: "Disputed deals",
      value: loading ? "…" : String(stats.disputed),
      icon: Scale,
      badge: { text: "Needs review", variant: "secondary" as const },
    },
    {
      title: "Pending deals",
      value: loading ? "…" : String(stats.pendingDeals),
      icon: ShieldCheck,
      badge: { text: "Awaiting action", variant: "secondary" as const },
    },
    {
      title: "In escrow + pipeline",
      value: loading ? "…" : String(stats.activePipeline),
      icon: PackageCheck,
      badge: { text: "Active lifecycle", variant: "secondary" as const },
    },
    {
      title: "Escrow held",
      value: loading ? "…" : formatMoneyEUR(stats.escrowHeld),
      icon: Clock,
      badge: { text: "Sum in escrow status", variant: "secondary" as const },
    },
  ]

  const extraShipCard = {
    title: "Shipments in transit",
    value: loading ? "…" : String(stats.inTransitShipments),
    Icon: Truck,
    badge: { text: "Live deliveries", variant: "secondary" as const },
  }
  const ExtraShipIcon = extraShipCard.Icon

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Admin Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Live metrics from your Neon database (deals & shipments APIs).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing
            </>
          ) : (
            "Refresh"
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}{" "}
          <span className="text-muted-foreground">
            Check DATABASE_URL and run init.sql if tables are missing.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card
              key={c.title}
              className="rounded-2xl border-border bg-card/60 p-5 shadow-sm lg:last:col-span-1"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{c.title}</div>
                  <div className="text-2xl font-semibold sm:text-3xl">{c.value}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant={c.badge.variant} className="w-fit">
                  {c.badge.text}
                </Badge>
              </div>
            </Card>
          )
        })}
        <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {extraShipCard.title}
              </div>
              <div className="text-2xl font-semibold sm:text-3xl">
                {extraShipCard.value}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5E90B4]/15 text-[#5E90B4]">
              <ExtraShipIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <Badge variant={extraShipCard.badge.variant} className="w-fit">
              {extraShipCard.badge.text}
            </Badge>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-border bg-card/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Disputed deals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rows where deal status is <code className="text-xs">disputed</code>.
            </p>
          </div>
          <Link href="/admin/disputes">
            <Button variant="outline" className="rounded-xl">
              Disputes workspace
            </Button>
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : disputedDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disputed deals in the database.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputedDeals.slice(0, 15).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{shortId(d.id)}</TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell>{formatMoneyEUR(d.price)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(d.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setDealModal(d)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border bg-card/60 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Recent deals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Newest first — click View for full order details.
            </p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : recentDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deals yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDeals.slice(0, 12).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {d.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {formatDateTime(d.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setDealModal(d)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card/60 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Recent shipments</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Newest first — full route and package metadata.
            </p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : recentShipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shipments yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentShipments.slice(0, 12).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-[180px] truncate font-medium">
                        {s.receiverName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {formatDateTime(s.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setShipmentModal(s)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!dealModal} onOpenChange={(o) => !o && setDealModal(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Deal details</DialogTitle>
            <DialogDescription>
              Full record from the <code className="text-xs">deals</code> table.
            </DialogDescription>
          </DialogHeader>
          {dealModal && (
            <dl className="grid gap-3 text-sm">
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs break-all">{dealModal.id}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium">{dealModal.title}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="whitespace-pre-wrap break-words">{dealModal.description || "—"}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Price</dt>
                <dd>{formatMoneyEUR(dealModal.price)}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{formatMoneyEUR(dealModal.shippingPrice)}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Currency</dt>
                <dd>{dealModal.currency}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="secondary">{dealModal.status}</Badge>
                </dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Your role (creator)</dt>
                <dd className="capitalize">{dealModal.role}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Counterparty</dt>
                <dd>{dealModal.counterparty}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDateTime(dealModal.createdAt)}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDateTime(dealModal.updatedAt)}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!shipmentModal} onOpenChange={(o) => !o && setShipmentModal(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Shipment details</DialogTitle>
            <DialogDescription>
              Full record from the <code className="text-xs">shipments</code> table.
            </DialogDescription>
          </DialogHeader>
          {shipmentModal && (
            <dl className="grid gap-3 text-sm">
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs break-all">{shipmentModal.id}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Sender</dt>
                <dd>
                  <div className="font-medium">{shipmentModal.senderName}</div>
                  <div className="text-muted-foreground">{shipmentModal.senderLocation}</div>
                </dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Receiver</dt>
                <dd>
                  <div className="font-medium">{shipmentModal.receiverName}</div>
                  <div className="text-muted-foreground">{shipmentModal.receiverLocation}</div>
                </dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Service</dt>
                <dd>{shipmentModal.service}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Dimensions</dt>
                <dd>{shipmentModal.dimensions}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Weight</dt>
                <dd>{shipmentModal.weight}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="secondary">{shipmentModal.status}</Badge>
                </dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDateTime(shipmentModal.createdAt)}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
