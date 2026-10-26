"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { History, Loader2, Search, ShieldAlert, UserCog, Users } from "lucide-react"
import { formatDealDateTime } from "@/lib/utils"
import type { AdminUserDTO, ModerationAction, ModerationEventDTO } from "@/lib/admin-users"
import type { UserStatus } from "@/lib/auth/session"

function statusBadge(status: UserStatus) {
  switch (status) {
    case "restricted":
      return { text: "RESTRICTED", className: "bg-warning/10 text-warning" }
    case "suspended":
      return { text: "SUSPENDED", className: "bg-destructive/10 text-destructive" }
    case "active":
    default:
      return { text: "ACTIVE", className: "bg-success/10 text-success" }
  }
}

const ACTION_LABELS: Record<ModerationAction, string> = {
  restrict: "Restricted",
  suspend: "Suspended",
  reinstate: "Reinstated",
  make_admin: "Made admin",
  remove_admin: "Admin removed",
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<"all" | "user" | "admin">("all")
  const [status, setStatus] = useState<UserStatus | "all">("all")
  const [users, setUsers] = useState<AdminUserDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [events, setEvents] = useState<ModerationEventDTO[]>([])
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (role !== "all") params.set("role", role)
      if (status !== "all") params.set("status", status)
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" })
      setUsers(res.ok ? await res.json() : [])
    } finally {
      setLoading(false)
    }
  }, [role, status])

  useEffect(() => {
    void load()
  }, [load])

  const active = useMemo(() => users.find((u) => u.id === activeId) ?? null, [users, activeId])

  useEffect(() => {
    setReason("")
    setError(null)
    setEvents([])
    if (!activeId) return
    fetch(`/api/admin/users/${activeId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {})
  }, [activeId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, query])

  async function moderate(action: ModerationAction) {
    if (!active) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${active.id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Failed to update user")
        return
      }
      setActiveId(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">User Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage roles and apply sanctions. Every change is recorded in the user&apos;s history.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-2xl border border-border bg-card px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="restricted">Restricted</option>
            <option value="suspended">Suspended</option>
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
          No users match these filters.
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((u) => {
              const s = statusBadge(u.status)
              return (
                <Card key={u.id} className="rounded-2xl border-border bg-card/60 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="truncate text-sm font-semibold text-foreground">{u.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Badge variant="secondary" className={s.className}>
                      {s.text}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="uppercase">{u.role}</Badge>
                    <span>KYC: {u.kycStatus}</span>
                    <span>• {u.dealsCount} deals</span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={() => setActiveId(u.id)} className="rounded-xl bg-primary">
                      Manage
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
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const s = statusBadge(u.status)
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{u.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={s.className}>
                            {s.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize text-muted-foreground">{u.kycStatus}</TableCell>
                        <TableCell className="text-sm">{u.dealsCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDealDateTime(u.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setActiveId(u.id)}>
                            Manage
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
                    <Badge variant="outline" className="uppercase">{active.role}</Badge>
                    <Badge variant="secondary" className={statusBadge(active.status).className}>
                      {statusBadge(active.status).text}
                    </Badge>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {active.email} • Joined {formatDealDateTime(active.createdAt)}
                </DialogDescription>
              </DialogHeader>

              {active.statusReason ? (
                <div className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm">
                  <span className="font-medium">Current sanction reason: </span>
                  {active.statusReason}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserCog className="h-4 w-4 text-primary" />
                    Role
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Admins get access to this panel. The user is signed out so the new role applies immediately.
                  </p>
                  {active.role === "admin" ? (
                    <Button variant="outline" className="w-full rounded-xl" disabled={busy} onClick={() => moderate("remove_admin")}>
                      Remove admin role
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full rounded-xl" disabled={busy} onClick={() => moderate("make_admin")}>
                      Make admin
                    </Button>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    Sanctions
                  </div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Reason (required to restrict or suspend)"
                    className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {active.status !== "active" ? (
                      <Button className="flex-1 rounded-xl bg-primary" disabled={busy} onClick={() => moderate("reinstate")}>
                        Reinstate
                      </Button>
                    ) : null}
                    {active.status !== "restricted" ? (
                      <Button variant="outline" className="flex-1 rounded-xl" disabled={busy} onClick={() => moderate("restrict")}>
                        Restrict
                      </Button>
                    ) : null}
                    {active.status !== "suspended" ? (
                      <Button variant="destructive" className="flex-1 rounded-xl" disabled={busy} onClick={() => moderate("suspend")}>
                        Suspend
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Restricted: can sign in, but can&apos;t open deals or move money. Suspended: can&apos;t sign in.
                  </p>
                </div>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <History className="h-4 w-4 text-primary" />
                  History
                </div>
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                  {events.length === 0 ? (
                    <p className="text-muted-foreground">No admin actions yet.</p>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="flex flex-col gap-0.5 border-b border-border/60 pb-2 last:border-0">
                        <div className="flex justify-between gap-3">
                          <span className="font-medium">{ACTION_LABELS[e.action]}</span>
                          <span className="text-xs text-muted-foreground">{formatDealDateTime(e.createdAt)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          by {e.adminName ?? "—"}
                          {e.reason ? ` — ${e.reason}` : ""}
                        </span>
                      </div>
                    ))
                  )}
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
