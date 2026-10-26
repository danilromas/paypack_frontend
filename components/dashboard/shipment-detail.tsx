"use client"

import { useState } from "react"
import {
  CalendarDays,
  ChevronRight,
  Copy,
  FileDown,
  Loader2,
  MapPin,
  Package,
  Pencil,
  RefreshCw,
  Trash2,
  Truck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Shipment, ShipmentEditPayload } from "@/lib/shipments"
import { SERVICE_TIERS, getServiceTier } from "@/lib/shipping-rates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  SHIPMENT_STATUS,
  SHIPMENT_STEPS,
  formatDateTime,
  formatDay,
  formatMoney,
  shipmentRoute,
  shipmentStepIndex,
} from "@/components/dashboard/shipment-display"

const fieldClass =
  "w-full rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ship/30"

function toEditPayload(s: Shipment): ShipmentEditPayload {
  return {
    senderName: s.senderName,
    senderLocation: s.senderLocation,
    receiverName: s.receiverName,
    receiverLocation: s.receiverLocation,
    serviceTier: s.serviceTier,
    weightKg: s.weightKg,
    lengthCm: s.lengthCm,
    widthCm: s.widthCm,
    heightCm: s.heightCm,
  }
}

function PartyBlock({ label, name, address, location }: { label: string; name: string; address: Shipment["senderAddress"]; location: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold text-foreground">{name}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {address ? (
          <>
            {address.street}
            <br />
            {address.zip} {address.city}, {address.country}
          </>
        ) : (
          location
        )}
      </div>
      {address && (
        <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          <div className="truncate">{address.phone}</div>
          <div className="truncate">{address.email}</div>
        </div>
      )}
    </div>
  )
}

export function ShipmentDetail({
  shipment,
  onAdvance,
  onUpdate,
  onDelete,
  showHeading = true,
}: {
  shipment: Shipment | null
  onAdvance: (id: string) => Promise<Shipment>
  onUpdate: (id: string, payload: ShipmentEditPayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
  showHeading?: boolean
}) {
  const [busy, setBusy] = useState<"advance" | "delete" | "save" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<ShipmentEditPayload | null>(null)
  const [copied, setCopied] = useState(false)

  // Reset transient state when another shipment is selected.
  const [shownId, setShownId] = useState(shipment?.id)
  if (shipment?.id !== shownId) {
    setShownId(shipment?.id)
    setError(null)
    setCopied(false)
  }

  const heading = showHeading ? (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
      <Package className="h-5 w-5 text-ship" />
      Shipment Detail
    </h2>
  ) : null

  if (!shipment) {
    return (
      <div>
        {heading}
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Select a shipment to see its route, label and tracking.
        </div>
      </div>
    )
  }

  const s = shipment
  const isCarrier = s.provider !== "internal"
  const brokerName = s.provider === "sendcloud" ? "Sendcloud" : "Eurosender"
  const status = SHIPMENT_STATUS[s.status]
  const activeStep = shipmentStepIndex(s.status)
  const route = shipmentRoute(s)
  const tier = getServiceTier(s.serviceTier)
  const canCancel = s.status === "pending"

  async function run<T>(kind: "advance" | "delete" | "save", fn: () => Promise<T>) {
    setBusy(kind)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    const prompt = isCarrier ? "Cancel the courier booking and remove this shipment?" : "Delete this shipment?"
    if (!window.confirm(prompt)) return
    await run("delete", () => onDelete(s.id))
  }

  async function handleSave() {
    if (!editForm) return
    const ok = await run("save", async () => {
      await onUpdate(s.id, editForm)
      return true
    })
    if (ok) setEditOpen(false)
  }

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(s.trackingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked (insecure context) — the number is still visible to copy by hand.
    }
  }

  return (
    <div>
      {heading}

      <div className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-0">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="mb-1 flex flex-wrap items-center gap-x-2 text-lg font-bold text-ship">
              <span className="truncate">{route.from}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{route.to}</span>
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={copyTracking}
                title="Copy tracking number"
                className="inline-flex items-center gap-1"
              >
                <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                  {s.trackingNumber}
                  <Copy className="h-2.5 w-2.5" />
                </Badge>
              </button>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", status.pill)}>
                {status.label}
              </span>
              <span>{tier?.label ?? s.serviceTier}</span>
              {copied && <span className="text-ship">Copied</span>}
            </div>
          </div>
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", status.iconBg)}>
            <status.icon className="h-5 w-5" />
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 flex justify-between gap-1 md:mb-8">
          {SHIPMENT_STEPS.map((step, i) => (
            <div key={step.status} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full items-center justify-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2",
                      i <= activeStep ? "bg-success" : "bg-border",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 h-4 w-4 rounded-full border-4",
                    i < activeStep || s.status === "arrived"
                      ? "border-success/30 bg-success"
                      : i === activeStep
                        ? "border-ship/30 bg-ship"
                        : "border-muted bg-muted-foreground/30",
                  )}
                />
              </div>
              <span className="text-center text-[10px] text-muted-foreground">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Carrier + pickup */}
        {isCarrier && (
          <div className="mb-6 space-y-3">
            <div className="pp-animate-slide-in flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ship/10 text-ship">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{s.carrierName ?? "Courier being assigned"}</div>
                <p className="truncate text-xs text-muted-foreground">
                  {s.providerOrderCode ? `${brokerName} · ${s.providerOrderCode}` : `Booked via ${brokerName}`}
                </p>
              </div>
              {s.trackingUrl && (
                <a
                  href={s.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center text-xs font-medium text-ship hover:underline"
                >
                  Track <ChevronRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {s.pickupDate && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ship/10 text-ship">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Courier pickup · {formatDay(s.pickupDate)}</div>
                  <p className="text-xs text-muted-foreground">
                    {s.status === "pending" ? "Have the box packed and labelled at the sender's address." : "Collected by the courier."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary action */}
        {isCarrier ? (
          <div className="mb-3 space-y-2">
            {s.labelUrl ? (
              <Button asChild className="w-full rounded-xl bg-ship py-5 text-sm font-semibold text-ship-foreground hover:bg-ship/90">
                <a href={s.labelUrl} target="_blank" rel="noopener noreferrer">
                  <FileDown className="mr-1.5 h-4 w-4" />
                  Download shipping label
                </a>
              </Button>
            ) : (
              s.status === "pending" && (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                  The carrier is preparing your label — check back in a few minutes.
                </div>
              )
            )}
            {s.status !== "arrived" && (
              <Button
                variant="outline"
                className="w-full rounded-xl py-5 text-sm"
                disabled={busy !== null}
                onClick={() => run("advance", () => onAdvance(s.id))}
              >
                {busy === "advance" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Refresh status from carrier
                  </>
                )}
              </Button>
            )}
            {s.labelUrl && s.status === "pending" && (
              <p className="text-center text-xs text-muted-foreground">Print the label and stick it on the box before pickup.</p>
            )}
          </div>
        ) : s.status !== "arrived" ? (
          <div className="mb-3 space-y-2">
            <Button
              className="w-full rounded-xl bg-ship py-5 text-sm font-semibold text-ship-foreground hover:bg-ship/90"
              disabled={busy !== null}
              onClick={() => run("advance", () => onAdvance(s.id))}
            >
              {busy === "advance" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : s.status === "pending" ? (
                "Mark as picked up"
              ) : (
                "Mark as delivered"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Manual tracking — no carrier is attached to this shipment.</p>
          </div>
        ) : (
          <div className="mb-3 rounded-2xl border border-success/20 bg-success/10 p-4 text-center text-sm font-medium text-success">
            Delivered
          </div>
        )}
        {error && <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">{error}</p>}

        {/* Route */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <PartyBlock label="From" name={s.senderName} address={s.senderAddress} location={s.senderLocation} />
          <PartyBlock label="To" name={s.receiverName} address={s.receiverAddress} location={s.receiverLocation} />
        </div>

        {/* Package + price */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Package</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{s.weightKg} kg</div>
            <div className="text-xs text-muted-foreground">
              {s.lengthCm}×{s.widthCm}×{s.heightCm} cm
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{isCarrier ? "Price paid" : "Estimate"}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{formatMoney(s.estimatedCost, s.estimatedCurrency)}</div>
            <div className="text-xs text-muted-foreground">{isCarrier ? "VAT included" : "Internal estimate"}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Created {formatDateTime(s.createdAt)}
          </span>
          <div className="flex items-center gap-1">
            {!isCarrier && s.status === "pending" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => {
                  setEditForm(toEditPayload(s))
                  setEditOpen(true)
                }}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {(!isCarrier || canCancel) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={busy !== null}
                onClick={handleDelete}
              >
                {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
                {isCarrier ? "Cancel booking" : "Delete"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Edit (manual shipments only — carrier bookings can't be changed after booking) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Edit shipment</DialogTitle>
            <DialogDescription className="text-xs">Only possible while the shipment is pending.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={editForm.senderName} onChange={(e) => setEditForm({ ...editForm, senderName: e.target.value })} placeholder="Sender name" className={fieldClass} />
                <input value={editForm.senderLocation} onChange={(e) => setEditForm({ ...editForm, senderLocation: e.target.value })} placeholder="Sender city, country" className={fieldClass} />
                <input value={editForm.receiverName} onChange={(e) => setEditForm({ ...editForm, receiverName: e.target.value })} placeholder="Receiver name" className={fieldClass} />
                <input value={editForm.receiverLocation} onChange={(e) => setEditForm({ ...editForm, receiverLocation: e.target.value })} placeholder="Receiver city, country" className={fieldClass} />
              </div>
              <select
                value={editForm.serviceTier}
                onChange={(e) => setEditForm({ ...editForm, serviceTier: e.target.value as ShipmentEditPayload["serviceTier"] })}
                className={fieldClass}
              >
                {SERVICE_TIERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-4 gap-2">
                {(["weightKg", "lengthCm", "widthCm", "heightCm"] as const).map((field) => (
                  <input
                    key={field}
                    type="number"
                    min={0}
                    step={0.1}
                    value={editForm[field]}
                    onChange={(e) => setEditForm({ ...editForm, [field]: Number(e.target.value) })}
                    placeholder={{ weightKg: "kg", lengthCm: "L", widthCm: "W", heightCm: "H" }[field]}
                    className={fieldClass}
                  />
                ))}
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button
                className="w-full rounded-xl bg-ship text-ship-foreground hover:bg-ship/90"
                disabled={busy !== null}
                onClick={handleSave}
              >
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
