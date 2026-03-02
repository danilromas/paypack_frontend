"use client"

import { Bell, Plus, Wallet, Package } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  const { mode, walletBalance, setNewDealModalOpen } = useAppStore()

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
      <Button
        onClick={() => setNewDealModalOpen(true)}
        className="gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl"
      >
        <Plus className="h-4 w-4" />
        {mode === "deal" ? "NEW DEAL" : "NEW SHIPMENT"}
        {mode === "ship" ? (
          <Package className="ml-1 h-4 w-4" />
        ) : null}
      </Button>

      <div className="flex items-center gap-6">
        <button className="relative text-muted-foreground transition-colors hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
            1
          </span>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-bold text-primary-foreground">
            JD
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            {walletBalance}$
          </div>
        </div>
      </div>
    </header>
  )
}
