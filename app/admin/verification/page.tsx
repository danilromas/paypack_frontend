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
import { Search, UserCheck, AlertTriangle, ShieldCheck, KeyRound, Loader2 } from "lucide-react"
import { formatDealDateTime } from "@/lib/utils"
import type { KycStatus, RiskLevel, VerificationUserDTO } from "@/lib/kyc"

function kycBadge(status: KycStatus) {
  switch (status) {
    case "pending":
      return { text: "PENDING", className: "bg-warning/10 text-warning" }
    case "approved":
      return { text: "APPROVED", className: "bg-success/10 text-success" }
    case "rejected":
      return { text: "REJECTED", className: "bg-destructive/10 text-destructive" }
    case "unverified":
    default:
      return { text: "UNVERIFIED", className: "bg-secondary text-secondary-foreground" }
  }
}

function riskBadge(level: RiskLevel) {
  switch (level) {
    case "low":
      return { text: "LOW", className: "bg-success/10 text-success" }
    case "medium":
      return { text: "MEDIUM", className: "bg-primary/10 text-primary" }
    case "high":
    default:
      return { text: "HIGH", className: "bg-destructive/10 text-destructive" }
  }
}

export default function VerificationRiskPage() {
  const [query, setQuery] = useState("")
  const [risk, setRisk] = useState<RiskLevel | "all">("all")
  const [users, setUsers] = useState<VerificationUserDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/verification", { cache: "no-store" })
      setUsers(res.ok ? await res.json() : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const active = useMemo(() => users.find((u) => u.userId === activeId) ?? null, [users, activeId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchesRisk = risk === "all" ? true : u.riskLevel === risk
      return matchesQuery && matchesRisk
    })
  }, [users, query, risk])

  async function decide(action: "pending" | "approved" | "rejected") {
    if (!active) return
    setDeciding(true)
    try {
      const res = await fetch(`/api/admin/verification/${active.userId}/decision`, {
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
        <h1 className="text-2xl font-bold sm:text-3xl">User Verification & Risk Review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review KYC submissions and account risk flags.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-2xl border border-border bg-card px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Risk</span>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value as typeof risk)}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
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
          No verification requests yet.
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((u) => {
              const k = kycBadge(u.status)
              const r = riskBadge(u.riskLevel)
              return (
                <Card key={u.userId} className="rounded-2xl border-border bg-card/60 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Badge variant="secondary" className={k.className}>
                      {k.text}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={r.className}>
                      Risk: {r.text}
                    </Badge>
                    {u.flags.slice(0, 2).map((f) => (
                      <Badge key={f} variant="outline" className="text-[11px]">
                        {f}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <Button size="sm" onClick={() => setActiveId(u.userId)} className="rounded-xl bg-primary">
                      Review
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
                    <TableHead>User</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const k = kycBadge(u.status)
                    const r = riskBadge(u.riskLevel)
                    return (
                      <TableRow key={u.userId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <UserCheck className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{u.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={k.className}>
                            {k.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={r.className}>
                            {r.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setActiveId(u.userId)}
                          >
                            Review
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
                <DialogTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{active.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{kycBadge(active.status).text}</Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      Risk: {riskBadge(active.riskLevel).text}
                    </Badge>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {active.email} • Account created {formatDealDateTime(active.createdAccountAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Documents
                  </div>
                  <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                    {active.documents.length === 0 ? (
                      <p>No documents submitted.</p>
                    ) : (
                      active.documents.map((doc) => (
                        <div key={doc.id} className="flex gap-3">
                          <span className="w-36 shrink-0 text-xs font-medium capitalize text-foreground">
                            {doc.docType.replace("_", " ")}
                          </span>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                            {doc.fileUrl}
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Risk flags
                  </div>
                  <div className="mt-3 space-y-2">
                    {active.flags.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No active flags.</div>
                    ) : (
                      active.flags.map((f) => (
                        <Badge key={f} variant="outline" className="w-fit">
                          {f}
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <KeyRound className="h-4 w-4 text-primary" />
                      Recommendation
                    </div>
                    <div className="mt-2">
                      {active.riskLevel === "high"
                        ? "Consider restricting until evidence is confirmed."
                        : "Proceed with verification; monitor for additional signals."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Admin actions</div>
                    <div className="text-xs text-muted-foreground">Updates the user's account.</div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={deciding}
                      onClick={() => decide("pending")}
                    >
                      Request more info
                    </Button>
                    <Button className="rounded-xl bg-primary" disabled={deciding} onClick={() => decide("approved")}>
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-xl"
                      disabled={deciding}
                      onClick={() => decide("rejected")}
                    >
                      Restrict
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Select a user.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
