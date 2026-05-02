import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Scale, ShieldCheck, Clock, PackageCheck } from "lucide-react"

const cards = [
  {
    title: "Pending disputes",
    value: "2",
    icon: Scale,
    badge: { text: "Needs review", variant: "secondary" as const },
  },
  {
    title: "KYC pending",
    value: "5",
    icon: ShieldCheck,
    badge: { text: "Verification queue", variant: "secondary" as const },
  },
  {
    title: "Active deals",
    value: "12",
    icon: PackageCheck,
    badge: { text: "In escrow", variant: "secondary" as const },
  },
  {
    title: "Escrow held",
    value: "8,420€",
    icon: Clock,
    badge: { text: "Last 24h", variant: "secondary" as const },
  },
]

const recent = [
  {
    id: "DSP-10021",
    ref: "Deal #25311491",
    type: "Item not received",
    status: "open" as const,
    openedAt: "2026-03-05",
  },
  {
    id: "DSP-10018",
    ref: "Deal #88732014",
    type: "Cancel request",
    status: "needs-info" as const,
    openedAt: "2026-03-04",
  },
  {
    id: "DSP-10010",
    ref: "Shipment PP-EXP-4421",
    type: "Tracking mismatch",
    status: "resolved" as const,
    openedAt: "2026-03-02",
  },
]

function statusBadge(status: (typeof recent)[number]["status"]) {
  switch (status) {
    case "open":
      return { text: "OPEN", variant: "secondary" as const }
    case "needs-info":
      return { text: "NEEDS INFO", variant: "secondary" as const }
    case "resolved":
    default:
      return { text: "RESOLVED", variant: "secondary" as const }
  }
}

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Admin Overview</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Operational dashboard for disputes and verification workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title} className="rounded-2xl border-border bg-card/60 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    {c.title}
                  </div>
                  <div className="text-3xl font-semibold">{c.value}</div>
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
      </div>

      <Card className="rounded-2xl border-border bg-card/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent disputes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest cases across deals and shipments.
            </p>
          </div>
          <Link href="/admin/disputes">
            <Button variant="outline" className="rounded-xl">
              Open Disputes
            </Button>
          </Link>
        </div>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((d) => {
                const badge = statusBadge(d.status)
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.id}</TableCell>
                    <TableCell>{d.ref}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.text}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.openedAt}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

