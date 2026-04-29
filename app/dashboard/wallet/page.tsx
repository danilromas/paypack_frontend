"use client"

import { useMemo, useState } from "react"
import { Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Receipt } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAppStore } from "@/store/app-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type OpType = "topup" | "withdrawal" | "escrow_hold" | "payout"
type OpDirection = "in" | "out"

type WalletOperation = {
  id: string
  type: OpType
  direction: OpDirection
  amountEur: number
  status: "completed" | "pending" | "processing"
  createdAt: string
  details: string
}

const initialOps: WalletOperation[] = [
  {
    id: "OP-9001",
    type: "escrow_hold",
    direction: "out",
    amountEur: 520,
    status: "completed",
    createdAt: "2026-03-05 14:22",
    details: "Escrow hold for Deal #25311491",
  },
  {
    id: "OP-9002",
    type: "payout",
    direction: "in",
    amountEur: 320,
    status: "completed",
    createdAt: "2026-03-04 18:03",
    details: "Payout released for Deal #88732014",
  },
  {
    id: "OP-9003",
    type: "withdrawal",
    direction: "out",
    amountEur: 200,
    status: "pending",
    createdAt: "2026-03-04 11:30",
    details: "Withdrawal to bank • IBAN ending 2041",
  },
  {
    id: "OP-9004",
    type: "topup",
    direction: "in",
    amountEur: 250,
    status: "completed",
    createdAt: "2026-03-02 09:15",
    details: "Top up via card",
  },
]

function typeMeta(type: OpType) {
  switch (type) {
    case "topup":
      return { label: "Top up", icon: CreditCard, badge: "bg-primary/10 text-primary" }
    case "withdrawal":
      return { label: "Withdrawal", icon: ArrowUpRight, badge: "bg-destructive/10 text-destructive" }
    case "escrow_hold":
      return { label: "Escrow hold", icon: Receipt, badge: "bg-warning/10 text-warning" }
    case "payout":
    default:
      return { label: "Payout", icon: ArrowDownRight, badge: "bg-success/10 text-success" }
  }
}

function statusMeta(status: WalletOperation["status"]) {
  switch (status) {
    case "completed":
      return { text: "COMPLETED", className: "bg-success/10 text-success" }
    case "processing":
      return { text: "PROCESSING", className: "bg-primary/10 text-primary" }
    case "pending":
    default:
      return { text: "PENDING", className: "bg-warning/10 text-warning" }
  }
}

export default function WalletPage() {
  const { walletBalance } = useAppStore()
  const [ops, setOps] = useState<WalletOperation[]>(initialOps)
  const [tab, setTab] = useState<"operations" | "withdraw" | "topup">("operations")
  const [filter, setFilter] = useState<OpType | "all">("all")
  const [activeId, setActiveId] = useState<string | null>(null)

  const available = walletBalance
  const inEscrow = 2050
  const pendingPayout = 540

  const active = useMemo(() => (activeId ? ops.find((o) => o.id === activeId) ?? null : null), [
    activeId,
    ops,
  ])

  const filteredOps = useMemo(() => {
    return ops.filter((o) => (filter === "all" ? true : o.type === filter))
  }, [ops, filter])

  const onAction = (kind: "withdraw" | "topup", amount: number) => {
    const isWithdraw = kind === "withdraw"
    const op: WalletOperation = {
      id: `OP-${Math.floor(10000 + Math.random() * 90000)}`,
      type: isWithdraw ? "withdrawal" : "topup",
      direction: isWithdraw ? "out" : "in",
      amountEur: amount,
      status: "processing",
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      details: isWithdraw ? "Withdrawal request (demo)" : "Top up request (demo)",
    }
    setOps((prev) => [op, ...prev])
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Wallet</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Available balance, escrow holds, payouts and operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/60 px-4 py-3">
                <Wallet className="h-4 w-4 text-primary" />
                <div className="text-sm text-muted-foreground">Available</div>
                <div className="text-base font-semibold text-foreground">{available}$</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Available
              </div>
              <div className="mt-2 text-3xl font-bold">{available}$</div>
              <div className="mt-1 text-sm text-muted-foreground">Ready to use for deals.</div>
            </Card>
            <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                In escrow
              </div>
              <div className="mt-2 text-3xl font-bold">{inEscrow}€</div>
              <div className="mt-1 text-sm text-muted-foreground">Held until confirmation.</div>
            </Card>
            <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pending payout
              </div>
              <div className="mt-2 text-3xl font-bold">{pendingPayout}€</div>
              <div className="mt-1 text-sm text-muted-foreground">Releases when conditions meet.</div>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="w-full sm:w-fit">
                <TabsTrigger value="operations" className="rounded-xl">Operations</TabsTrigger>
                <TabsTrigger value="withdraw" className="rounded-xl">Withdraw</TabsTrigger>
                <TabsTrigger value="topup" className="rounded-xl">Top up</TabsTrigger>
              </TabsList>

              {tab === "operations" ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Filter</span>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="all">All</option>
                    <option value="topup">Top up</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="escrow_hold">Escrow hold</option>
                    <option value="payout">Payout</option>
                  </select>
                </div>
              ) : null}
            </div>

            <TabsContent value="operations" className="mt-4">
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredOps.map((o) => {
                  const meta = typeMeta(o.type)
                  const st = statusMeta(o.status)
                  return (
                    <Card key={o.id} className="rounded-2xl border-border bg-card/60 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <meta.icon className="h-4 w-4" />
                            </div>
                            <div className="truncate text-sm font-semibold">{meta.label}</div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">{o.details}</div>
                        </div>
                        <Badge variant="secondary" className={cn("rounded-full px-2 py-1", st.className)}>
                          {st.text}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                        <div className="text-xs text-muted-foreground">{o.createdAt}</div>
                        <div className="text-sm font-semibold text-foreground">
                          {o.direction === "in" ? "+" : "-"}
                          {o.amountEur}€
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button size="sm" className="rounded-xl bg-primary" onClick={() => setActiveId(o.id)}>
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
                        <TableHead>Operation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOps.map((o) => {
                        const meta = typeMeta(o.type)
                        const st = statusMeta(o.status)
                        return (
                          <TableRow key={o.id}>
                            <TableCell className="min-w-[320px]">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                  <meta.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{meta.label}</div>
                                  <div className="truncate text-xs text-muted-foreground">{o.details}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn("rounded-full px-2 py-1", st.className)}>
                                {st.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {o.direction === "in" ? "+" : "-"}
                              {o.amountEur}€
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{o.createdAt}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="withdraw" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                    Withdraw to bank (demo)
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Amount (EUR)</div>
                      <input
                        type="number"
                        min={1}
                        defaultValue={50}
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Destination</div>
                      <input
                        type="text"
                        defaultValue="IBAN ending 2041"
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
                      Demo: this will add a “processing” operation to the list.
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
                  <div className="text-sm font-semibold">Quick actions</div>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <Button
                      className="w-full rounded-xl bg-primary"
                      onClick={() => onAction("withdraw", 50)}
                    >
                      Withdraw 50€
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => onAction("withdraw", 120)}
                    >
                      Withdraw 120€
                    </Button>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Available funds: {available}$. (Demo UI only)
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="topup" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Top up funds (demo)
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-xs text-primary">
                      Demo: this will add a “processing” operation.
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Card details</div>
                      <input
                        type="text"
                        defaultValue="**** **** **** 4242"
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
                  <div className="text-sm font-semibold">Quick actions</div>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <Button className="w-full rounded-xl bg-primary" onClick={() => onAction("topup", 75)}>
                      Top up 75€
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => onAction("topup", 250)}
                    >
                      Top up 250€
                    </Button>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Funds are available immediately after completion. (Demo)
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={activeId !== null} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-2xl">
          {active ? (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{active.id}</span>
                  <Badge variant="secondary">{typeMeta(active.type).label}</Badge>
                </DialogTitle>
                <DialogDescription>{active.details}</DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="text-xs font-medium text-muted-foreground">Amount</div>
                  <div className="mt-2 text-lg font-semibold">
                    {active.direction === "in" ? "+" : "-"}
                    {active.amountEur}€
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card/60 p-4">
                  <div className="text-xs font-medium text-muted-foreground">Status</div>
                  <div className="mt-2">
                    <Badge variant="secondary" className={cn("rounded-full px-2 py-1", statusMeta(active.status).className)}>
                      {statusMeta(active.status).text}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4">
                <div className="text-xs font-medium text-muted-foreground">Created</div>
                <div className="mt-2 text-sm text-foreground">{active.createdAt}</div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button className="rounded-xl bg-primary" onClick={() => setActiveId(null)}>
                  Done
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

