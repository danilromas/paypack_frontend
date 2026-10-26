"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronRight, Loader2, Package, Search, Truck } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { NewShipmentWizard } from "@/components/dashboard/new-shipment-wizard"
import { ShipmentDetail } from "@/components/dashboard/shipment-detail"
import { SHIPMENT_STATUS, formatMoney, shipmentRoute } from "@/components/dashboard/shipment-display"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsBelowLg } from "@/hooks/use-below-lg"
import { useAppStore } from "@/store/app-store"
import { cn, formatDealRelativeTime } from "@/lib/utils"
import type { Shipment, ShipmentCreatePayload, ShipmentEditPayload, ShipmentStatus } from "@/lib/shipments"
import { SERVICE_TIERS, getServiceTier } from "@/lib/shipping-rates"

type Filter = "all" | "active" | ShipmentStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Booked" },
  { id: "in-transit", label: "In transit" },
  { id: "arrived", label: "Delivered" },
]

async function errorFrom(response: Response, fallback: string) {
  const data = await response.json().catch(() => null)
  return new Error(data?.error ?? fallback)
}

function ShipmentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsBelowLg()
  const { setMode } = useAppStore()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const mode = searchParams.get("mode")
    if (mode === "deal" || mode === "ship") setMode(mode)
    else setMode("ship")

    if (searchParams.get("new") === "1") {
      setWizardOpen(true)
    }
  }, [searchParams, setMode])

  const loadShipments = async () => {
    try {
      const response = await fetch("/api/shipments", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load shipments")
      const data = (await response.json()) as Shipment[]
      setShipments(data)
      setError(null)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      return null
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
    // Carrier rejections (bad postcode, unavailable pickup day…) are actionable — show them as-is.
    if (!response.ok) throw await errorFrom(response, "Failed to create shipment")
    const created = (await response.json()) as Shipment
    await loadShipments()
    setSelectedId(created.id)
  }

  const updateShipment = async (id: string, payload: ShipmentEditPayload) => {
    const response = await fetch(`/api/shipments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw await errorFrom(response, "Failed to update shipment")
    await loadShipments()
  }

  const deleteShipment = async (id: string) => {
    const response = await fetch(`/api/shipments/${id}`, { method: "DELETE" })
    if (!response.ok) throw await errorFrom(response, "Failed to delete shipment")
    setSheetOpen(false)
    setSelectedId(null)
    await loadShipments()
  }

  const advanceShipment = async (id: string) => {
    const response = await fetch(`/api/shipments/${id}/advance`, { method: "POST" })
    if (!response.ok) throw await errorFrom(response, "Failed to update shipment")
    const updated = (await response.json()) as Shipment
    setShipments((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  const stats = useMemo(() => {
    const active = shipments.filter((s) => s.status !== "arrived")
    const booked = shipments.filter((s) => s.status === "pending")
    const inTransit = shipments.filter((s) => s.status === "in-transit")
    const delivered = shipments.filter((s) => s.status === "arrived")
    const spent = shipments
      .filter((s) => s.provider !== "internal" && s.estimatedCurrency === "EUR")
      .reduce((sum, s) => sum + s.estimatedCost, 0)
    return { active, booked, inTransit, delivered, spent }
  }, [shipments])

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return shipments.filter((s) => {
      if (filter === "active" && s.status === "arrived") return false
      if (filter !== "all" && filter !== "active" && s.status !== filter) return false
      if (serviceFilter !== "all" && s.serviceTier !== serviceFilter) return false
      if (query) {
        const haystack = [s.senderName, s.senderLocation, s.receiverName, s.receiverLocation, s.trackingNumber, s.carrierName ?? ""]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [shipments, filter, serviceFilter, search])

  // Desktop always shows a detail panel, so fall back to the newest shipment when nothing is picked.
  const selected = shipments.find((s) => s.id === selectedId) ?? (isMobile ? null : shipments[0] ?? null)

  function openShipment(id: string) {
    setSelectedId(id)
    if (isMobile) setSheetOpen(true)
  }

  const detailProps = {
    shipment: selected,
    onAdvance: advanceShipment,
    onUpdate: updateShipment,
    onDelete: deleteShipment,
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        {/* Title */}
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
              <Truck className="h-6 w-6 text-ship" />
              Shipments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Door-to-door courier delivery across the EU — book, print the label, track.
            </p>
          </div>
          <Button
            onClick={() => setWizardOpen(true)}
            className="gap-2 rounded-2xl bg-ship px-6 py-5 text-sm font-semibold text-ship-foreground shadow-md hover:bg-ship/90"
          >
            <Package className="h-4 w-4" />
            New Shipment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: "Active", value: stats.active.length, hint: `${stats.booked.length} awaiting pickup`, filter: "active" as Filter },
            { label: "In transit", value: stats.inTransit.length, hint: "On the way now", filter: "in-transit" as Filter },
            { label: "Delivered", value: stats.delivered.length, hint: "Arrived safely", filter: "arrived" as Filter },
          ].map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => setFilter(card.filter)}
              className={cn(
                "rounded-2xl border bg-card p-5 text-left transition-colors hover:border-ship/30",
                filter === card.filter ? "border-ship/40" : "border-border",
              )}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{card.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{card.hint}</div>
            </button>
          ))}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Spent</div>
            <div className="mt-2 text-2xl font-bold text-foreground">{formatMoney(stats.spent, "EUR")}</div>
            <div className="mt-1 text-xs text-muted-foreground">Courier bookings, VAT incl.</div>
          </div>
        </div>

        {/* Search & filters */}
        <div className="mt-6 flex flex-col gap-3 lg:mt-8 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, city, tracking #..."
              className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ship/30"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-lg border px-4 py-2 text-sm transition-all",
                  filter === f.id
                    ? "border-ship/30 bg-ship/10 font-medium text-ship"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label="Service"
              className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground outline-none focus:ring-2 focus:ring-ship/30"
            >
              <option value="all">Any service</option>
              {SERVICE_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Truck className="h-5 w-5 text-ship" />
              Your shipments
              {!loading && <span className="text-sm font-normal text-muted-foreground">({filteredShipments.length})</span>}
            </h2>

            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shipments...
              </div>
            ) : shipments.length === 0 ? (
              <div className="pp-animate-scale-in rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="mb-1 font-medium text-foreground">No shipments yet</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Compare live courier prices and book a door-to-door pickup in a couple of minutes.
                </p>
                <Button
                  onClick={() => setWizardOpen(true)}
                  className="gap-2 rounded-xl bg-ship px-5 text-sm font-semibold text-ship-foreground hover:bg-ship/90"
                >
                  <Package className="h-4 w-4" />
                  Send your first parcel
                </Button>
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No shipments match these filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredShipments.map((s) => {
                  const status = SHIPMENT_STATUS[s.status]
                  const route = shipmentRoute(s)
                  const isSelected = selected?.id === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => openShipment(s.id)}
                      className={cn(
                        "flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between",
                        isSelected ? "border-ship/40 shadow-md" : "border-border hover:border-ship/20",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12", status.iconBg)}>
                          <status.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 truncate font-semibold text-card-foreground">
                            <span className="truncate">{route.from}</span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{route.to}</span>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            To {s.receiverName} · {getServiceTier(s.serviceTier)?.label ?? s.serviceTier}
                            {s.carrierName ? ` · ${s.carrierName}` : ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDealRelativeTime(s.createdAt)} · <span className="font-mono">{s.trackingNumber}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                        <span className="text-sm font-semibold text-foreground">{formatMoney(s.estimatedCost, s.estimatedCurrency)}</span>
                        <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", status.pill)}>
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail — side panel on desktop, bottom sheet on mobile */}
          {!isMobile && (
            <div className="lg:col-span-1">
              <ShipmentDetail {...detailProps} />
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl p-4">
            <SheetHeader className="p-0 pb-2">
              <SheetTitle>Shipment</SheetTitle>
              <SheetDescription className="sr-only">Route, label and tracking for this shipment.</SheetDescription>
            </SheetHeader>
            <ShipmentDetail {...detailProps} showHeading={false} />
          </SheetContent>
        </Sheet>
      )}

      {wizardOpen && (
        <NewShipmentWizard
          onClose={() => {
            setWizardOpen(false)
            if (searchParams.get("new") === "1") router.replace("/dashboard/shipments")
          }}
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
