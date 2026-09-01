"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { ShipmentsTable } from "@/components/dashboard/shipments-table"
import { NewShipmentWizard } from "@/components/dashboard/new-shipment-wizard"
import { Search, Package } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useAppStore } from "@/store/app-store"
import type { Shipment, ShipmentCreatePayload, ShipmentEditPayload, ShipmentStatus } from "@/lib/shipments"
import { SERVICE_TIERS } from "@/lib/shipping-rates"

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "Pending",
  "in-transit": "In transit",
  arrived: "Arrived",
}

function ShipmentsPageContent() {
  const searchParams = useSearchParams()
  const { setMode } = useAppStore()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const mode = searchParams.get("mode")
    if (mode === "deal" || mode === "ship") setMode(mode)
    else setMode("ship")

    if (searchParams.get("new") === "1") {
      setWizardOpen(true)
    }
  }, [searchParams, setMode])

  const loadShipments = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/shipments", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load shipments")
      const data = (await response.json()) as Shipment[]
      setShipments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShipments()
  }, [])

  const createShipment = async (payload: ShipmentCreatePayload) => {
    const response = await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error("Failed to create shipment")
    await loadShipments()
  }

  const updateShipment = async (id: string, payload: ShipmentEditPayload) => {
    const response = await fetch(`/api/shipments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error("Failed to update shipment")
    await loadShipments()
  }

  const deleteShipment = async (id: string) => {
    const response = await fetch(`/api/shipments/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete shipment")
    await loadShipments()
  }

  const advanceShipment = async (id: string) => {
    const response = await fetch(`/api/shipments/${id}/advance`, { method: "POST" })
    if (!response.ok) throw new Error("Failed to advance shipment")
    await loadShipments()
  }

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return shipments.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false
      if (serviceFilter !== "all" && s.serviceTier !== serviceFilter) return false
      if (query) {
        const haystack = [
          s.senderName,
          s.senderLocation,
          s.receiverName,
          s.receiverLocation,
          s.trackingNumber,
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [shipments, statusFilter, serviceFilter, search])

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
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 sm:px-4">
              <span className="text-xs text-muted-foreground">Service</span>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="min-w-0 bg-transparent text-sm font-medium text-foreground outline-none"
              >
                <option value="all">All</option>
                {SERVICE_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 sm:px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ShipmentStatus | "all")}
                className="min-w-0 bg-transparent text-sm font-medium text-foreground outline-none"
              >
                <option value="all">All</option>
                {(Object.keys(STATUS_LABELS) as ShipmentStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block sm:flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender, receiver, tracking #..."
              className="w-full min-w-0 rounded-xl border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-64"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <ShipmentsTable
          shipments={filteredShipments}
          isLoading={loading}
          onUpdate={updateShipment}
          onDelete={deleteShipment}
          onAdvance={advanceShipment}
        />
      </div>

      {wizardOpen && (
        <NewShipmentWizard
          onClose={() => setWizardOpen(false)}
          onCreate={createShipment}
        />
      )}
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
