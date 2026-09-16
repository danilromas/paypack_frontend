"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Handshake,
  LayoutDashboard,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { cn, formatDealRelativeTime } from "@/lib/utils";
import type { Deal } from "@/types";

function isYourTurn(deal: Deal): boolean {
  if (deal.status === "pending" && deal.myRole === "buyer") return true;
  if (deal.status === "escrow" && deal.myRole === "seller") return true;
  if (deal.status === "shipped" && deal.myRole === "buyer") return true;
  return false;
}

const statusBadge: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  escrow: "bg-warning/40 text-warning-foreground",
  shipped: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  disputed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function DashboardOverviewPage() {
  const router = useRouter();
  const {
    deals,
    wallet,
    chatThreads,
    notifications,
    setSelectedDealId,
    setNewDealModalOpen,
    tourPendingStart,
    setTourPendingStart,
    startTour,
  } = useAppStore();

  useEffect(() => {
    if (!tourPendingStart) return;
    setTourPendingStart(false);
    startTour();
  }, [tourPendingStart, setTourPendingStart, startTour]);

  const activeDeals = useMemo(
    () => deals.filter((d) => d.status === "pending" || d.status === "escrow" || d.status === "shipped"),
    [deals],
  );
  const activeValue = useMemo(
    () => activeDeals.reduce((sum, d) => sum + d.price + d.shippingPrice, 0),
    [activeDeals],
  );
  const yourTurnDeals = useMemo(() => deals.filter(isYourTurn), [deals]);
  const unreadChats = chatThreads.reduce((sum, t) => sum + t.unreadCount, 0);
  const unreadNotifications = notifications.filter((n) => !n.readAt).length;
  const recentDeals = deals.slice(0, 6);

  function openDeal(id: string) {
    setSelectedDealId(id);
    router.push("/dashboard/deals");
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything happening across your deals at a glance.
            </p>
          </div>
          <Button
            data-tour="new-deal-button"
            onClick={() => setNewDealModalOpen(true)}
            className="gap-2 rounded-2xl bg-primary px-6 py-5 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90"
          >
            <Handshake className="h-4 w-4" />
            New Deal
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active deals
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">{activeDeals.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {activeValue.toFixed(2)} total value
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              In escrow
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {(wallet?.inEscrow ?? 0).toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Held until confirmation</div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/deals")}
            className="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/30"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your turn
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">{yourTurnDeals.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Deals waiting on you</div>
          </button>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Unread
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-lg font-bold text-foreground">
                <MessageCircle className="h-4 w-4 text-primary" />
                {unreadChats}
              </span>
              <span className="flex items-center gap-1 text-lg font-bold text-foreground">
                <Bell className="h-4 w-4 text-primary" />
                {unreadNotifications}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Chats · Notifications</div>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <button
              type="button"
              onClick={() => router.push("/dashboard/deals")}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all deals
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentDeals.length === 0 ? (
            <div className="pp-animate-scale-in rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">No deals yet — create your first one.</p>
              <Button
                onClick={() => setNewDealModalOpen(true)}
                className="gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Handshake className="h-4 w-4" />
                Create your first deal
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDeals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => openDeal(deal.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{deal.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDealRelativeTime(deal.createdAt)} · You're the {deal.myRole}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {deal.price + deal.shippingPrice} {deal.currency}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        statusBadge[deal.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {deal.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
