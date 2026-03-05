"use client"

import { Suspense, useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { ShipmentsTable, type Shipment } from "@/components/dashboard/shipments-table"
import { NewShipmentWizard } from "@/components/dashboard/new-shipment-wizard"
import { Search, Package, Wallet } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useAppStore } from "@/store/app-store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"

function ShipmentsPageContent() {
  const searchParams = useSearchParams()
  const { setMode, walletBalance } = useAppStore()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)

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
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#5E90B4] via-[#5E90B4] to-[#3b6d94] px-8 py-6">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-primary-foreground">
              Shipments Dashboard
            </h1>
            <p className="text-sm text-primary-foreground/70">
              Manage and track all your deliveries
            </p>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-card/95 px-6 py-3 font-semibold text-[#275b7d] shadow-lg transition-all hover:shadow-xl"
          >
            <Package className="h-5 w-5" />
            NEW SHIPMENT
          </button>
        </div>
      </div>

      {/* Wallet + Filters */}
      <div className="px-8 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-3">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-muted-foreground">Wallet Balance:</span>
            <span className="text-xl font-bold text-foreground">
              {walletBalance}$
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
          {["Sender", "Receiver", "Service", "Status"].map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2"
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <select className="bg-transparent text-sm font-medium text-foreground outline-none">
                <option>All</option>
              </select>
            </div>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search shipments..."
              className="w-64 rounded-xl border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <ShipmentsTable onSelectShipment={setSelectedShipment} />

        {/* Pagination */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing 1-3 of 24 shipments
          </span>
          <div className="flex gap-2">
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

      <Dialog
        open={!!selectedShipment}
        onOpenChange={(open) => {
          if (!open) setSelectedShipment(null)
        }}
      >
        <DialogContent>
          {selectedShipment && (
            <>
              <DialogHeader>
                <DialogTitle>Shipment #{selectedShipment.id}</DialogTitle>
                <DialogDescription>
                  Detailed information about this delivery.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Sender
                    </p>
                    <p className="font-semibold text-foreground">
                      {selectedShipment.sender.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedShipment.sender.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Receiver
                    </p>
                    <p className="font-semibold text-foreground">
                      {selectedShipment.receiver.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedShipment.receiver.location}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Service
                    </p>
                    <p className="font-semibold text-foreground">
                      {selectedShipment.service}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Status
                    </p>
                    <p className="font-semibold uppercase text-foreground">
                      {selectedShipment.status}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Dimensions
                    </p>
                    <p className="font-semibold text-foreground">
                      {selectedShipment.dimensions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Weight
                    </p>
                    <p className="font-semibold text-foreground">
                      {selectedShipment.weight}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Created at
                  </p>
                  <p className="font-semibold text-foreground">
                    {new Date(selectedShipment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <DialogClose asChild>
                  <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                    Close
                  </button>
                </DialogClose>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
