"use client";

import {
  Check,
  Lock,
  CheckCheck,
  Play,
  Shield,
  CheckCircle,
  Clock,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { cn, formatDealRelativeTime } from "@/lib/utils";
import type { Deal, DealStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const statusSortOrder: DealStatus[] = [
  "pending",
  "escrow",
  "in-transit",
  "shipped",
  "completed",
  "disputed",
];

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
    case "completed":
      return {
        icon: CheckCircle,
        label: "Completed",
        className: "bg-success/10 text-success border border-success/20",
      };
    case "shipped":
    case "in-transit":
      return {
        icon: Clock,
        label: "In Transit",
        className: "bg-primary/10 text-primary border border-primary/20",
      };
    default:
      return {
        icon: Clock,
        label: status,
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
    case "completed":
      return { icon: CheckCheck, bg: "bg-primary/10 text-primary" };
    default:
      return { icon: Clock, bg: "bg-muted text-muted-foreground" };
  }
}

function getEventLabel(status: DealStatus) {
  switch (status) {
    case "pending":
      return "Deal Created";
    case "escrow":
      return "Funds Locked";
    case "completed":
      return "Deal Released";
    default:
      return "Updated";
  }
}

interface DealsListProps {
  activeFilter?: string;
  searchQuery?: string;
}

export function DealsList({
  activeFilter = "All",
  searchQuery = "",
}: DealsListProps) {
  const { selectedDealId, setSelectedDealId, deals } = useAppStore();
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);

  // Функция для фильтрации сделок
  const getFilteredDeals = () => {
    let filtered = [...deals];

    // Фильтр по статусу
    if (activeFilter !== "All") {
      const statusMap: Record<string, DealStatus[]> = {
        Active: ["pending", "escrow", "shipped", "in-transit"],
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
          deal.status.toLowerCase().includes(query),
      );
    }

    // Сортировка по статусам в порядке, как они отображаются пользователю
    filtered.sort((a, b) => {
      const aIndex = statusSortOrder.indexOf(a.status);
      const bIndex = statusSortOrder.indexOf(b.status);

      const safeAIndex = aIndex === -1 ? statusSortOrder.length : aIndex;
      const safeBIndex = bIndex === -1 ? statusSortOrder.length : bIndex;

      return safeAIndex - safeBIndex;
    });

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

            return (
              <div
                key={deal.id}
                onClick={() => {
                  setSelectedDealId(deal.id);
                  setDetailDeal(deal);
                }}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-0",
                  selectedDealId === deal.id
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
                    <h4 className="truncate font-semibold text-card-foreground">
                      {getEventLabel(deal.status)}
                    </h4>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatDealRelativeTime(deal.createdAt)} &bull; #
                      {deal.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                      statusConfig.className,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </span>
                  <button
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Добавьте здесь обработчик для меню
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="mt-4 w-full rounded-xl border border-border bg-card py-3 text-center text-sm font-medium text-primary transition-all hover:bg-secondary">
        All Deals...
      </button>

      <Dialog open={!!detailDeal} onOpenChange={(open) => !open && setDetailDeal(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Deal details</DialogTitle>
            <DialogDescription>
              Read-only deal info. Use New Deal or update flow to change data.
            </DialogDescription>
          </DialogHeader>
          {detailDeal && (
            <dl className="grid gap-3 text-sm">
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs break-all">{detailDeal.id}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium">{detailDeal.title}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="whitespace-pre-wrap break-words">{detailDeal.description || "—"}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Amount</dt>
                <dd>{detailDeal.price} {detailDeal.currency}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{detailDeal.shippingPrice} {detailDeal.currency}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="secondary">{detailDeal.status}</Badge>
                </dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="capitalize">{detailDeal.role}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Counterparty</dt>
                <dd>{detailDeal.counterparty}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(detailDeal.createdAt).toLocaleString()}</dd>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(detailDeal.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
