"use client"

import { Wallet, ArrowLeftRight, Search } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { useState } from "react"

const filters = ["All", "Active", "Disputed", "Completed"]

export function StatsRow() {
  const { walletBalance } = useAppStore()
  const [activeFilter, setActiveFilter] = useState("All")

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-3">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="text-muted-foreground">Wallet Balance:</span>
          <span className="text-xl font-bold text-foreground">
            {walletBalance}$
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-3">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <span className="text-muted-foreground">Active Deals:</span>
          <span className="text-xl font-bold text-foreground">3</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search deals..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                activeFilter === f
                  ? "border-primary/30 bg-primary/10 font-medium text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
