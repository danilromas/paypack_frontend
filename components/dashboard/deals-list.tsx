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
import { useAppStore, mockDeals } from "@/store/app-store";
import { cn } from "@/lib/utils";
import type { DealStatus } from "@/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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
  const { selectedDealId, setSelectedDealId } = useAppStore();

  // Функция для фильтрации сделок
  const getFilteredDeals = () => {
    let filtered = [...mockDeals];

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
                onClick={() => setSelectedDealId(deal.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md",
                  selectedDealId === deal.id
                    ? "border-primary/30 shadow-md"
                    : "border-border hover:border-primary/20",
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      eventConfig.bg,
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
                      statusConfig.className,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="rounded p-1 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setSelectedDealId(deal.id)}
                      >
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Open chat</DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        Cancel deal (soon)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="mt-4 w-full rounded-xl border border-border bg-card py-3 text-center text-sm font-medium text-primary transition-all hover:bg-secondary"
        onClick={() => {
          if (filteredDeals[0]) {
            setSelectedDealId(filteredDeals[0].id);
          }
        }}
      >
        All Deals...
      </button>
    </div>
  );
}
