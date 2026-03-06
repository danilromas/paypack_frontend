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

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-card px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
              Shipments Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and track all your deliveries
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl sm:px-6 sm:py-3 sm:text-base"
          >
            <Package className="h-5 w-5" />
            NEW SHIPMENT
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
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
