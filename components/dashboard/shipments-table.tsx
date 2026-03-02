"use client"

import { cn } from "@/lib/utils"

const shipments = [
  {
    id: "1",
    sender: { name: "Ivanov Ivan", location: "Moscow, Russia", initials: "II", color: "from-primary to-primary/70" },
    receiver: { name: "Petrov Sergey", location: "Saint Petersburg" },
    service: "Express 24h",
    serviceColor: "bg-primary/10 text-primary border-primary/20",
    dimensions: "30x20x15 cm",
    weight: "2.5 kg",
    status: "arrived" as const,
  },
  {
    id: "2",
    sender: { name: "Anna Smith", location: "London, UK", initials: "AS", color: "from-success to-success/70" },
    receiver: { name: "John Doe", location: "Manchester, UK" },
    service: "Standard",
    serviceColor: "bg-secondary text-secondary-foreground border-border",
    dimensions: "40x30x25 cm",
    weight: "5.0 kg",
    status: "in-transit" as const,
  },
  {
    id: "3",
    sender: { name: "Maria Kuznetsova", location: "Berlin, Germany", initials: "MK", color: "from-warning to-warning/70" },
    receiver: { name: "Hans Mueller", location: "Munich, Germany" },
    service: "Same Day",
    serviceColor: "bg-primary/10 text-primary border-primary/20",
    dimensions: "25x15x10 cm",
    weight: "1.2 kg",
    status: "pending" as const,
  },
]

function getStatusBadge(status: "arrived" | "in-transit" | "pending") {
  switch (status) {
    case "arrived":
      return { label: "ARRIVED", className: "bg-success text-success-foreground" }
    case "in-transit":
      return { label: "IN TRANSIT", className: "bg-primary text-primary-foreground" }
    case "pending":
      return { label: "PENDING", className: "bg-warning text-warning-foreground" }
  }
}

export function ShipmentsTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full">
        <thead className="border-b border-border bg-secondary/50">
          <tr>
            {["Sender", "Receiver", "Service", "Dimensions/Weight", "Status", "Action"].map((h) => (
              <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {shipments.map((s) => {
            const badge = getStatusBadge(s.status)
            return (
              <tr key={s.id} className="transition-colors hover:bg-secondary/30">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-primary-foreground", s.sender.color)}>
                      {s.sender.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{s.sender.name}</div>
                      <div className="text-xs text-muted-foreground">{s.sender.location}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="font-semibold text-foreground">{s.receiver.name}</div>
                  <div className="text-xs text-muted-foreground">{s.receiver.location}</div>
                </td>
                <td className="px-6 py-5">
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", s.serviceColor)}>
                    {s.service}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-foreground">
                  {s.dimensions}
                  <br />
                  <span className="text-muted-foreground">{s.weight}</span>
                </td>
                <td className="px-6 py-5">
                  <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", badge.className)}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <button className="text-sm font-medium text-primary hover:underline">
                      Tracking
                    </button>
                    <span className="text-border">|</span>
                    <button className="text-sm text-muted-foreground hover:text-foreground">
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
