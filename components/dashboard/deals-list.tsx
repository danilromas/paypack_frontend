"use client"

import {
  Check,
  Lock,
  CheckCheck,
  Play,
  Shield,
  CheckCircle,
  Clock,
  MoreVertical,
} from "lucide-react"
import { useAppStore, mockDeals } from "@/store/app-store"
import { cn } from "@/lib/utils"
import type { DealStatus } from "@/types"

function getStatusConfig(status: DealStatus) {
  switch (status) {
    case "pending":
      return {
        icon: Play,
        label: "Pending",
        className:
          "bg-warning/10 text-warning border border-warning/20",
      }
    case "escrow":
      return {
        icon: Shield,
        label: "In Escrow",
        className:
          "bg-warning/10 text-warning border border-warning/20",
      }
    case "completed":
      return {
        icon: CheckCircle,
        label: "Completed",
        className:
          "bg-success/10 text-success border border-success/20",
      }
    case "shipped":
    case "in-transit":
      return {
        icon: Clock,
        label: "In Transit",
        className:
          "bg-primary/10 text-primary border border-primary/20",
      }
    default:
      return {
        icon: Clock,
        label: status,
        className:
          "bg-muted text-muted-foreground border border-border",
      }
  }
}

function getEventIcon(status: DealStatus) {
  switch (status) {
    case "pending":
      return { icon: Check, bg: "bg-success/10 text-success" }
    case "escrow":
      return { icon: Lock, bg: "bg-warning/10 text-warning" }
    case "completed":
      return { icon: CheckCheck, bg: "bg-primary/10 text-primary" }
    default:
      return { icon: Clock, bg: "bg-muted text-muted-foreground" }
  }
}

function getEventLabel(status: DealStatus) {
  switch (status) {
    case "pending":
      return "Deal Created"
    case "escrow":
      return "Funds Locked"
    case "completed":
      return "Deal Released"
    default:
      return "Updated"
  }
}

export function DealsList() {
  const { selectedDealId, setSelectedDealId } = useAppStore()

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Clock className="h-5 w-5 text-primary" />
        Recent Activity
      </h2>

      <div className="space-y-3">
        {mockDeals.map((deal) => {
          const statusConfig = getStatusConfig(deal.status)
          const eventConfig = getEventIcon(deal.status)
          const StatusIcon = statusConfig.icon
          const EventIcon = eventConfig.icon

          return (
            <button
              key={deal.id}
              onClick={() => setSelectedDealId(deal.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md",
                selectedDealId === deal.id
                  ? "border-primary/30 shadow-md"
                  : "border-border hover:border-primary/20"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    eventConfig.bg
                  )}
                >
                  <EventIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-card-foreground">
                    {getEventLabel(deal.status)}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {deal.createdAt} &bull; #{deal.id.padStart(8, "4431754")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                    statusConfig.className
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </span>
                <button
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </button>
          )
        })}
      </div>

      <button className="mt-4 w-full rounded-xl border border-border bg-card py-3 text-center text-sm font-medium text-primary transition-all hover:bg-secondary">
        All Deals...
      </button>
    </div>
  )
}
