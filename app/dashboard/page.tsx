"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { DealsList } from "@/components/dashboard/deals-list";
import { DealDetail } from "@/components/dashboard/deal-detail";
import { StatsRow } from "@/components/dashboard/stats-row";
import { NewDealModal } from "@/components/dashboard/new-deal-modal";
import { useAppStore } from "@/store/app-store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { newDealModalOpen, setNewDealModalOpen, setMode } = useAppStore();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMode("deal");
  }, [setMode]);

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8 flex justify-center">
          <Button
            onClick={() => setNewDealModalOpen(true)}
            className="h-14 px-10 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl"
          >
            NEW DEAL
          </Button>
        </div>
        <StatsRow
          onFilterChange={setActiveFilter}
          onSearchChange={setSearchQuery}
        />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
