"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { DealsList } from "@/components/dashboard/deals-list";
import { DealDetail } from "@/components/dashboard/deal-detail";
import { StatsRow } from "@/components/dashboard/stats-row";
import { NewDealModal } from "@/components/dashboard/new-deal-modal";
import { useAppStore } from "@/store/app-store";
import type { Deal } from "@/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Handshake } from "lucide-react";

export default function DashboardPage() {
  const { newDealModalOpen, setNewDealModalOpen, setMode, setDeals } = useAppStore();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dealsError, setDealsError] = useState<string | null>(null);

  useEffect(() => {
    setMode("deal");
  }, [setMode]);

  useEffect(() => {
    let cancelled = false;
    async function loadDeals() {
      setDealsError(null);
      try {
        const res = await fetch("/api/deals", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load deals");
        const data = (await res.json()) as Deal[];
        if (!cancelled) setDeals(data);
      } catch {
        if (!cancelled) setDealsError("Could not load deals. Check DATABASE_URL and run init.sql on Neon.");
      }
    }
    loadDeals();
    return () => {
      cancelled = true;
    };
  }, [setDeals]);

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mb-6 flex justify-center md:mb-8">
          <Button
            onClick={() => setNewDealModalOpen(true)}
            className="h-12 w-full max-w-[min(100%-2rem,28rem)] gap-2 rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl md:h-14 md:w-auto md:max-w-none md:gap-3 md:px-10 md:text-lg"
          >
            <Handshake className="h-5 w-5" />
            NEW DEAL
          </Button>
        </div>
        <StatsRow
          onFilterChange={setActiveFilter}
          onSearchChange={setSearchQuery}
        />
        {dealsError && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {dealsError}
          </div>
        )}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DealsList activeFilter={activeFilter} searchQuery={searchQuery} />
          </div>
          <div className="lg:col-span-1">
            <DealDetail />
          </div>
        </div>
      </div>
      {newDealModalOpen && <NewDealModal />}
    </>
  );
}
