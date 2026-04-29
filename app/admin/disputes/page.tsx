"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Search, AlertTriangle, CheckCircle2, Scale, FileText } from "lucide-react"

type DisputeStatus = "open" | "needs-info" | "resolved"

type Dispute = {
  id: string
  ref: string
  type: string
  status: DisputeStatus
  openedAt: string
  amountEur: number
  evidence: string[]
  timeline: { at: string; text: string }[]
}

const initialDisputes: Dispute[] = [
  {
    id: "DSP-10021",
    ref: "Deal #25311491",
    type: "Item not received",
    status: "open",
    openedAt: "2026-03-05",
    amountEur: 520,
    evidence: ["Tracking log", "Courier receipt", "Counterparty messages"],
    timeline: [
      { at: "2026-03-05 10:14", text: "Dispute opened by buyer" },
      { at: "2026-03-05 10:20", text: "System locked escrow" },
      { at: "2026-03-05 11:05", text: "Counterparty requested more time" },
    ],
  },
  {
    id: "DSP-10018",
    ref: "Deal #88732014",
    type: "Cancel request",
    status: "needs-info",
    openedAt: "2026-03-04",
    amountEur: 210,
    evidence: ["Cancellation agreement", "Shipment status screenshots"],
    timeline: [
      { at: "2026-03-04 08:02", text: "Dispute opened by seller" },
      { at: "2026-03-04 08:15", text: "Admin requested additional evidence" },
    ],
  },
  {
    id: "DSP-10010",
    ref: "Shipment PP-EXP-4421",
    type: "Tracking mismatch",
    status: "resolved",
    openedAt: "2026-03-02",
    amountEur: 98,
    evidence: ["Tracking history", "Photos of package labels"],
    timeline: [
      { at: "2026-03-02 14:41", text: "Admin approved partial refund" },
      { at: "2026-03-02 15:10", text: "Escrow payout completed" },
    ],
  },
]

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
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes)
  const [activeId, setActiveId] = useState<string | null>(null)

  const active = useMemo(
    () => disputes.find((d) => d.id === activeId) ?? null,
    [disputes, activeId],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return disputes.filter((d) => {
      const matchesQuery =
        !q || d.id.toLowerCase().includes(q) || d.ref.toLowerCase().includes(q)
      const matchesStatus = status === "all" ? true : d.status === status
      return matchesQuery && matchesStatus
    })
  }, [disputes, query, status])

  const onResolve = (nextStatus: DisputeStatus) => {
    if (!active) return
    setDisputes((prev) =>
      prev.map((d) => (d.id === active.id ? { ...d, status: nextStatus } : d)),
    )
    setActiveId(null)
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
              placeholder="Search by id or reference..."
              className="w-full rounded-2xl border border-border bg-card px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="needs-info">Needs info</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Mobile list */}
      <div className="space-y-3 md:hidden">
        {filtered.map((d) => {
          const b = statusBadge(d.status)
          return (
            <Card
              key={d.id}
              className="rounded-2xl border-border bg-card/60 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    {d.ref}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Opened: {d.openedAt}
                  </div>
                </div>
                <Badge variant="secondary" className={b.className}>
                  {b.text}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">
                  {d.amountEur} EUR
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveId(d.id)}
                  className="rounded-xl bg-primary"
                >
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
                <TableHead>Case</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
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
                    <TableCell className="font-medium">{d.id}</TableCell>
                    <TableCell>{d.ref}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={b.className}>
                        {b.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {d.amountEur} EUR
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

      <Dialog open={activeId !== null} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-2xl">
          {active ? (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>{active.id}</span>
                  <Badge variant="secondary">
                    {statusBadge(active.status).text}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {active.ref} • {active.type}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Scale className="h-4 w-4 text-primary" />
                    Timeline
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {active.timeline.map((t) => (
                      <div key={t.at} className="flex gap-3">
                        <span className="w-32 shrink-0 text-xs text-muted-foreground">
                          {t.at}
                        </span>
                        <span>{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-primary" />
                    Evidence
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {active.evidence.map((e) => (
                      <li key={e} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Decision</div>
                    <div className="text-xs text-muted-foreground">
                      Update dispute status (demo).
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onResolve("needs-info")}
                    >
                      Request more info
                    </Button>
                    <Button
                      className="rounded-xl bg-primary"
                      onClick={() => onResolve("resolved")}
                    >
                      Approve & resolve
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">
              Select a dispute.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

