"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Search, AlertTriangle, Scale, FileText, Loader2 } from "lucide-react"
import { formatDealDateTime } from "@/lib/utils"
import type { DisputeDTO, DisputeStatus } from "@/lib/disputes"

function statusBadge(status: DisputeStatus) {
  switch (status) {
    case "open":
      return { text: "OPEN", className: "bg-destructive/10 text-destructive" }
    case "needs-info":
      return { text: "NEEDS INFO", className: "bg-warning/10 text-warning" }
    case "resolved":
    default:
      return { text: "RESOLVED", className: "bg-success/10 text-success" }
  }
}

export default function AdminDisputesPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<DisputeStatus | "all">("all")
  const [disputes, setDisputes] = useState<DisputeDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/disputes", { cache: "no-store" })
      setDisputes(res.ok ? await res.json() : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const active = useMemo(() => disputes.find((d) => d.id === activeId) ?? null, [disputes, activeId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return disputes.filter((d) => {
      const matchesQuery = !q || d.id.toLowerCase().includes(q) || d.dealTitle.toLowerCase().includes(q)
      const matchesStatus = status === "all" ? true : d.status === status
      return matchesQuery && matchesStatus
    })
  }, [disputes, query, status])

  async function decide(action: "needs-info" | "resolved") {
    if (!active) return
    setDeciding(true)
    try {
      const res = await fetch(`/api/admin/disputes/${active.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setActiveId(null)
        await load()
      }
    } finally {
      setDeciding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Dispute Center</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review disputes, request evidence, and decide outcomes.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by id or deal title..."
              className="w-full rounded-2xl border border-border bg-card px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="needs-info">Needs info</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card/60 p-8 text-center text-sm text-muted-foreground shadow-sm">
          No disputes match this filter.
        </Card>
      ) : (
        <>
          {/* Mobile list */}
          <div className="space-y-3 md:hidden">
            {filtered.map((d) => {
              const b = statusBadge(d.status)
              return (
                <Card key={d.id} className="rounded-2xl border-border bg-card/60 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">{d.dealTitle}</div>
                      <div className="text-xs text-muted-foreground">Opened by {d.openedByName}</div>
                      <div className="text-xs text-muted-foreground">
                        Opened: {formatDealDateTime(d.createdAt)}
                      </div>
                    </div>
                    <Badge variant="secondary" className={b.className}>
                      {b.text}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {d.amount.toFixed(2)} {d.currency}
                    </div>
                    <Button size="sm" onClick={() => setActiveId(d.id)} className="rounded-xl bg-primary">
                      Open
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Card className="rounded-2xl border-border bg-card/60 p-0 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Opened by</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => {
                    const b = statusBadge(d.status)
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[240px] truncate font-medium">{d.dealTitle}</TableCell>
                        <TableCell className="text-muted-foreground">{d.openedByName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={b.className}>
                            {b.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {d.amount.toFixed(2)} {d.currency}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setActiveId(d.id)}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}

      <Dialog open={activeId !== null} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-2xl">
          {active ? (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>{active.dealTitle}</span>
                  <Badge variant="secondary">{statusBadge(active.status).text}</Badge>
                </DialogTitle>
                <DialogDescription>
                  Opened by {active.openedByName} • {active.amount.toFixed(2)} {active.currency}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Scale className="h-4 w-4 text-primary" />
                    Timeline
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {active.events.map((e) => (
                      <div key={e.id} className="flex gap-3">
                        <span className="w-32 shrink-0 text-xs text-muted-foreground">
                          {formatDealDateTime(e.createdAt)}
                        </span>
                        <span>
                          {e.text}
                          {e.actorName ? <span className="text-muted-foreground"> — {e.actorName}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-primary" />
                    Reason
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    {active.reason}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Decision</div>
                    <div className="text-xs text-muted-foreground">Update dispute status.</div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={deciding || active.status !== "open"}
                      onClick={() => decide("needs-info")}
                    >
                      Request more info
                    </Button>
                    <Button
                      className="rounded-xl bg-primary"
                      disabled={deciding || active.status === "resolved"}
                      onClick={() => decide("resolved")}
                    >
                      Approve & resolve
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Select a dispute.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
