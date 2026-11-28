"use client";

import {
  Check,
  Lock,
  CheckCheck,
  Play,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Ban,
  Truck,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { cn, formatDealRelativeTime } from "@/lib/utils";
import type { Deal, DealStatus } from "@/types";
import { nextStepFor } from "@/lib/deals";

function getStatusConfig(status: DealStatus) {
  switch (status) {
    case "pending":
      return {
        icon: Play,
        label: "Pending",
        className: "bg-warning/20 text-warning-foreground border border-warning/20 ",
      };
    case "escrow":
      return {
        icon: Shield,
        label: "In Escrow",
        className: "bg-warning/40 text-warning-foreground border border-warning/20",
      };
    case "shipped":
      return {
        icon: Truck,
        label: "Shipped",
        className: "bg-primary/10 text-primary border border-primary/20",
      };
    case "completed":
      return {
        icon: CheckCircle,
        label: "Completed",
        className: "bg-success/10 text-success border border-success/20",
      };
    case "disputed":
      return {
        icon: AlertTriangle,
        label: "Disputed",
        className: "bg-destructive/10 text-destructive border border-destructive/20",
      };
    case "cancelled":
    default:
      return {
        icon: Ban,
        label: "Cancelled",
        className: "bg-muted text-muted-foreground border border-border",
      };
  }
}

function getEventIcon(status: DealStatus) {
  switch (status) {
    case "pending":
      return { icon: Check, bg: "bg-success/10 text-success" };
    case "escrow":
      return { icon: Lock, bg: "bg-warning/10 text-warning" };
    case "shipped":
      return { icon: Truck, bg: "bg-ship/10 text-ship" };
    case "completed":
      return { icon: CheckCheck, bg: "bg-primary/10 text-primary" };
    case "disputed":
      return { icon: AlertTriangle, bg: "bg-destructive/10 text-destructive" };
    default:
      return { icon: Clock, bg: "bg-muted text-muted-foreground" };
  }
}

function getEventLabel(deal: Deal) {
  switch (deal.status) {
    case "pending":
      return "Deal Created";
    case "escrow":
      return "Funds Locked";
    case "shipped":
      return deal.deliveredAt ? "Delivered" : "Shipped";
    case "completed":
      return "Deal Released";
    case "disputed":
      return "Dispute Opened";
    case "cancelled":
      return "Cancelled";
    default:
      return "Updated";
  }
}

interface DealsListProps {
  activeFilter?: string;
  searchQuery?: string;
  /** Called after a deal is selected — the page uses it to open the detail sheet on small screens. */
  onOpenDeal?: (id: string) => void;
}

export function DealsList({
  activeFilter = "All",
  searchQuery = "",
  onOpenDeal,
}: DealsListProps) {
  const { selectedDealId, setSelectedDealId, deals } = useAppStore();
  // DealDetail falls back to the newest deal when nothing is picked — mirror that for the highlight.
  const highlightedId = selectedDealId ?? deals[0]?.id;

  // Функция для фильтрации сделок
  const getFilteredDeals = () => {
    let filtered = [...deals];

    // Фильтр по статусу
    if (activeFilter !== "All") {
      const statusMap: Record<string, DealStatus[]> = {
        Active: ["pending", "escrow", "shipped"],
        Pending: ["pending"],
        "In Escrow": ["escrow"],
        Disputed: ["disputed"],
        Completed: ["completed"],
      };

      const statuses = statusMap[activeFilter];
      if (statuses) {
        filtered = filtered.filter((deal) => statuses.includes(deal.status));
      }
    }

    // Поиск по ID или другим полям
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deal) =>
          deal.id.toLowerCase().includes(query) ||
          deal.title.toLowerCase().includes(query) ||
          (deal.counterpartyName ?? deal.counterparty).toLowerCase().includes(query) ||
          deal.status.toLowerCase().includes(query),
      );
    }

    // `deals` from the store already arrives newest-first (created_at DESC) — keep that order.
    return filtered;
  };

  const filteredDeals = getFilteredDeals();

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Clock className="h-5 w-5 text-primary" />
        Recent Activity {activeFilter !== "All" && `(${activeFilter})`}
        {searchQuery && ` - Search: "${searchQuery}"`}
      </h2>

      {filteredDeals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No deals found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map((deal) => {
            const statusConfig = getStatusConfig(deal.status);
            const eventConfig = getEventIcon(deal.status);
            const StatusIcon = statusConfig.icon;
            const EventIcon = eventConfig.icon;
            const nextStep = nextStepFor(deal);

            return (
              <button
                key={deal.id}
                type="button"
                onClick={() => {
                  setSelectedDealId(deal.id);
                  onOpenDeal?.(deal.id);
                }}
                className={cn(
                  "flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between",
                  highlightedId === deal.id
                    ? "border-primary/30 shadow-md"
                    : "border-border hover:border-primary/20",
                )}
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12",
                      eventConfig.bg,
                    )}
                  >
                    <EventIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-semibold text-card-foreground">{deal.title}</h4>
                    <p className="truncate text-sm text-muted-foreground">
                      You're the {deal.myRole} · {deal.counterpartyName ?? deal.counterparty}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getEventLabel(deal)} {formatDealRelativeTime(deal.status === "pending" ? deal.createdAt : deal.updatedAt)} · #
                      {deal.id.slice(0, 8)}
                    </p>
                    {nextStep ? (
                      <p
                        className={cn(
                          "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          nextStep.mine ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {nextStep.mine ? "Your turn: " : ""}
                        {nextStep.label}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <span className="text-sm font-semibold text-foreground">
                    {deal.price + deal.shippingPrice} {deal.currency}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                      statusConfig.className,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}
