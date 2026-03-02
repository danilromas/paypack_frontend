"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { DealsList } from "@/components/dashboard/deals-list";
import { DealDetail } from "@/components/dashboard/deal-detail";
import { StatsRow } from "@/components/dashboard/stats-row";
import { NewDealModal } from "@/components/dashboard/new-deal-modal";
import { useAppStore } from "@/store/app-store";
import { useState } from "react";

export default function DashboardPage() {
  const { newDealModalOpen } = useAppStore();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto p-8">
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
