"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bell, CircleCheck, Circle, Mail, Package, ShieldAlert } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type NotificationType = "deal" | "shipment" | "security" | "wallet"

type Notification = {
  id: string
  title: string
  description: string
  type: NotificationType
  createdAt: string
  readAt: string | null
  relatedHref?: string
}

const initialNotifications: Notification[] = [
  {
    id: "NTF-1001",
    title: "Funds locked for deal #25311491",
    description:
      "Escrow has started and the seller can now prepare shipment.",
    type: "deal",
    createdAt: "2026-03-05 10:14",
    readAt: null,
    relatedHref: "/dashboard",
  },
  {
    id: "NTF-1002",
    title: "New shipment created",
    description: "Tracking is available. Share the code with your counterparty.",
    type: "shipment",
    createdAt: "2026-03-05 10:20",
    readAt: null,
    relatedHref: "/dashboard/shipments",
  },
  {
    id: "NTF-1003",
    title: "Verification request received",
    description:
      "A new KYC verification request is waiting in the review queue.",
    type: "security",
    createdAt: "2026-03-04 08:02",
    readAt: "2026-03-04 09:10",
    relatedHref: "/dashboard/settings",
  },
  {
    id: "NTF-1004",
    title: "Wallet payout pending",
    description:
      "Your payout is pending. You can track its progress in the Wallet page.",
    type: "wallet",
    createdAt: "2026-03-03 18:03",
    readAt: null,
    relatedHref: "/dashboard/wallet",
  },
]

function typeMeta(type: NotificationType) {
  switch (type) {
    case "deal":
      return { icon: Mail, label: "Deal" as const }
    case "shipment":
      return { icon: Package, label: "Shipment" as const }
    case "security":
      return { icon: ShieldAlert, label: "Security" as const }
    case "wallet":
    default:
      return { icon: Bell, label: "Wallet" as const }
  }
}

function readStatus(readAt: string | null) {
  return {
    isRead: Boolean(readAt),
    badgeClass: readAt ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary",
    badgeText: readAt ? "READ" : "UNREAD",
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(initialNotifications)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("unread")
  const [type, setType] = useState<NotificationType | "all">("all")
  const [activeId, setActiveId] = useState<string | null>(null)

  const active = useMemo(
    () => (activeId ? items.find((n) => n.id === activeId) ?? null : null),
    [activeId, items],
  )

  const filtered = useMemo(() => {
    return items.filter((n) => {
      const st = readStatus(n.readAt)
      const matchesFilter = filter === "all" ? true : filter === "unread" ? !st.isRead : st.isRead
      const matchesType = type === "all" ? true : n.type === type
      return matchesFilter && matchesType
    })
  }, [items, filter, type])

  const openNotification = (id: string) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, readAt: n.readAt ?? new Date().toISOString().slice(0, 10) }
          : n,
      ),
    )
    setActiveId(id)
  }

  const markAllRead = () => {
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString().slice(0, 10) })),
    )
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Important updates about your deals and wallet activity.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={markAllRead}>
                Mark all as read
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All</option>
                <option value="deal">Deal</option>
                <option value="shipment">Shipment</option>
                <option value="security">Security</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((n) => {
              const { icon: Icon, label } = typeMeta(n.type)
              const st = readStatus(n.readAt)
              return (
                <Card key={n.id} className="rounded-2xl border-border bg-card/60 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="truncate text-sm font-semibold">{n.title}</div>
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.description}</div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{label}</span>
                        <span>•</span>
                        <span>{n.createdAt}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn("rounded-full px-2 py-1", st.badgeClass)}>
                      {st.badgeText}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {n.relatedHref ? (
                      <Link href={n.relatedHref} className="text-sm font-medium text-primary hover:underline">
                        Open related
                      </Link>
                    ) : (
                      <span />
                    )}
                    <Button size="sm" className="rounded-xl bg-primary" onClick={() => openNotification(n.id)}>
                      Details
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => {
                    const meta = typeMeta(n.type)
                    const st = readStatus(n.readAt)
                    return (
                      <TableRow key={n.id}>
                        <TableCell className="min-w-[260px]">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <meta.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{n.title}</div>
                              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {n.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{meta.label}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("rounded-full px-2 py-1", st.badgeClass)}>
                            {st.badgeText}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{n.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => openNotification(n.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={activeId !== null} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-2xl">
          {active ? (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{active.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{typeMeta(active.type).label}</Badge>
                    {readStatus(active.readAt).isRead ? (
                      <Badge variant="outline" className="rounded-full">
                        Read
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary" variant="secondary">
                        Unread
                      </Badge>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription>{active.description}</DialogDescription>
              </DialogHeader>

              <Separator className="my-3" />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-foreground">{active.createdAt}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground">
                    {readStatus(active.readAt).badgeText}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                {active.relatedHref ? (
                  <Link href={active.relatedHref}>
                    <Button variant="outline" className="rounded-xl">
                      Open related
                    </Button>
                  </Link>
                ) : null}
                <Button
                  className="rounded-xl bg-primary"
                  onClick={() => {
                    setActiveId(null)
                  }}
                >
                  Done
                </Button>
              </div>
            </>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Select a notification.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

