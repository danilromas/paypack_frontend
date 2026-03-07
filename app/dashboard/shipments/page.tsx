"use client"

import { Suspense, useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { ShipmentsTable } from "@/components/dashboard/shipments-table"
import { NewShipmentWizard } from "@/components/dashboard/new-shipment-wizard"
import { Search, Package, Wallet } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useAppStore } from "@/store/app-store"

function ShipmentsPageContent() {
  const searchParams = useSearchParams()
  const { setMode, walletBalance } = useAppStore()
  const [wizardOpen, setWizardOpen] = useState(false)

  useEffect(() => {
    const mode = searchParams.get("mode")
    if (mode === "deal" || mode === "ship") setMode(mode)
    else setMode("ship")

    if (searchParams.get("new") === "1") {
      setWizardOpen(true)
    }
  }, [searchParams, setMode])

  return (
    <>
      <DashboardHeader />

      {/* Centered CTA - same as dashboard deals */}
      <div className="flex flex-1 flex-col overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mb-6 flex justify-center md:mb-8">
          <button
            onClick={() => setWizardOpen(true)}
            className="flex w-full max-w-[min(100%-2rem,28rem)] items-center justify-center gap-2 rounded-2xl bg-[#5E90B4] px-6 py-3 text-base font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl md:w-auto md:max-w-none md:px-10 md:py-3.5 md:text-lg"
          >
            <Package className="h-5 w-5" />
            NEW SHIPMENT
          </button>
        </div>
        {/* <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-3">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-muted-foreground">Wallet Balance:</span>
            <span className="text-xl font-bold text-foreground">
              {walletBalance}$
            </span>
          </div>
        </div> */}

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
          <div className="flex flex-wrap gap-2 sm:flex-1 sm:flex-initial">
            {["Sender", "Receiver", "Service", "Status"].map((label) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 sm:px-4"
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <select className="min-w-0 bg-transparent text-sm font-medium text-foreground outline-none">
                  <option>All</option>
                </select>
              </div>
            ))}
          </div>
          <div className="hidden shrink-0 sm:block sm:flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search shipments..."
              className="w-full min-w-0 rounded-xl border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-64"
            />
          </div>
        </div>

        <ShipmentsTable />

        {/* Pagination */}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center text-sm text-muted-foreground sm:text-left">
            Showing 1-3 of 24 shipments
          </span>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
            <button className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
              Previous
            </button>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow">
              1
            </button>
            <button className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
              2
            </button>
            <button className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
              3
            </button>
            <button className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
              Next
            </button>
          </div>
        </div>
      </div>

      {wizardOpen && <NewShipmentWizard onClose={() => setWizardOpen(false)} />}
    </>
  )
}

export default function ShipmentsPage() {
  return (
    <Suspense fallback={null}>
      <ShipmentsPageContent />
    </Suspense>
  )
}
