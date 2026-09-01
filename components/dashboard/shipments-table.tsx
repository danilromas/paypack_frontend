"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Eye, Loader2, Package, Pencil, Trash2, Truck, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Shipment, ShipmentEditPayload, ShipmentStatus } from "@/lib/shipments"
import { getServiceTier, SERVICE_TIERS } from "@/lib/shipping-rates"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type SortDirection = "asc" | "desc"
type SortField = "date" | "receiver" | "sender" | "status"

const TRACKING_STEPS: { status: ShipmentStatus; label: string; icon: typeof Package }[] = [
  { status: "pending", label: "Booked", icon: Package },
  { status: "in-transit", label: "In transit", icon: Truck },
  { status: "arrived", label: "Arrived", icon: CheckCircle2 },
]

function trackingStepIndex(status: ShipmentStatus) {
  return TRACKING_STEPS.findIndex((s) => s.status === status)
}

function getStatusBadge(status: ShipmentStatus) {
  switch (status) {
    case "arrived":
      return { label: "ARRIVED", className: "bg-success text-success-foreground" }
    case "in-transit":
      return { label: "IN TRANSIT", className: "bg-primary text-primary-foreground" }
    default:
      return { label: "PENDING", className: "bg-warning text-warning-foreground" }
  }
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}

function toPayload(shipment: Shipment): ShipmentEditPayload {
  return {
    senderName: shipment.senderName,
    senderLocation: shipment.senderLocation,
    receiverName: shipment.receiverName,
    receiverLocation: shipment.receiverLocation,
    serviceTier: shipment.serviceTier,
    weightKg: shipment.weightKg,
    lengthCm: shipment.lengthCm,
    widthCm: shipment.widthCm,
    heightCm: shipment.heightCm,
  }
}

export function ShipmentsTable({
  shipments,
  isLoading,
  onUpdate,
  onDelete,
  onAdvance,
}: {
  shipments: Shipment[]
  isLoading: boolean
  onUpdate: (id: string, payload: ShipmentEditPayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdvance: (id: string) => Promise<void>
}) {
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ShipmentEditPayload | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [advancingId, setAdvancingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [detailShipment, setDetailShipment] = useState<Shipment | null>(null)

  const sortedShipments = useMemo(() => {
    return [...shipments].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "receiver":
          comparison = a.receiverName.localeCompare(b.receiverName)
          break
        case "sender":
          comparison = a.senderName.localeCompare(b.senderName)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [shipments, sortDirection, sortField])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortField(field)
    setSortDirection("asc")
  }

  const openEditor = (shipment: Shipment) => {
    setEditingId(shipment.id)
    setEditForm(toPayload(shipment))
    setActionError(null)
  }

  const saveEdit = async () => {
    if (!editingId || !editForm) return
    setSaving(true)
    setActionError(null)
    try {
      await onUpdate(editingId, editForm)
      setEditingId(null)
      setEditForm(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update shipment")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this shipment?")) return
    setDeletingId(id)
    setActionError(null)
    try {
      await onDelete(id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete shipment")
    } finally {
      setDeletingId(null)
    }
  }

  const handleAdvance = async (id: string) => {
    setAdvancingId(id)
    setActionError(null)
    try {
      await onAdvance(id)
      setDetailShipment((prev) => (prev && prev.id === id ? { ...prev, status: nextStatusOf(prev.status) } : prev))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to advance shipment")
    } finally {
      setAdvancingId(null)
    }
  }

  function nextStatusOf(status: ShipmentStatus): ShipmentStatus {
    if (status === "pending") return "in-transit"
    if (status === "in-transit") return "arrived"
    return status
  }

  return (
    <div className="mt-4">
      {actionError && <div className="mb-3 text-sm text-destructive">{actionError}</div>}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading shipments...
        </div>
      ) : sortedShipments.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No shipments yet. Create the first one using the button above.
        </div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                {[
                  ["receiver", "Receiver"],
                  ["sender", "Sender"],
                  [null, "Service"],
                  [null, "Package"],
                  ["status", "Status"],
                  ["date", "Date Created"],
                ].map(([field, label]) => (
                  <th
                    key={label}
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {field ? (
                      <button
                        type="button"
                        onClick={() => handleSort(field as SortField)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors",
                          sortField === field
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/70 hover:text-foreground"
                        )}
                      >
                        {label}
                        {sortField === field &&
                          (sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedShipments.map((shipment) => {
                const badge = getStatusBadge(shipment.status)
                const tier = getServiceTier(shipment.serviceTier)
                const isEditing = editingId === shipment.id && editForm

                return (
                  <tr key={shipment.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <>
                          <input
                            value={editForm.receiverName}
                            onChange={(e) =>
                              setEditForm((prev) => prev && { ...prev, receiverName: e.target.value })
                            }
                            className="mb-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                          <input
                            value={editForm.receiverLocation}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev && { ...prev, receiverLocation: e.target.value }
                              )
                            }
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-foreground">{shipment.receiverName}</div>
                          <div className="text-xs text-muted-foreground">{shipment.receiverLocation}</div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <>
                          <input
                            value={editForm.senderName}
                            onChange={(e) =>
                              setEditForm((prev) => prev && { ...prev, senderName: e.target.value })
                            }
                            className="mb-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                          <input
                            value={editForm.senderLocation}
                            onChange={(e) =>
                              setEditForm((prev) => prev && { ...prev, senderLocation: e.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-foreground">{shipment.senderName}</div>
                          <div className="text-xs text-muted-foreground">{shipment.senderLocation}</div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <select
                          value={editForm.serviceTier}
                          onChange={(e) =>
                            setEditForm((prev) => prev && { ...prev, serviceTier: e.target.value as typeof prev.serviceTier })
                          }
                          className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                        >
                          {SERVICE_TIERS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {tier?.label ?? shipment.serviceTier}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-foreground">
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={editForm.weightKg}
                            onChange={(e) => setEditForm((prev) => prev && { ...prev, weightKg: Number(e.target.value) })}
                            placeholder="kg"
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            value={editForm.lengthCm}
                            onChange={(e) => setEditForm((prev) => prev && { ...prev, lengthCm: Number(e.target.value) })}
                            placeholder="L cm"
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          {shipment.lengthCm}×{shipment.widthCm}×{shipment.heightCm} cm
                          <br />
                          <span className="text-muted-foreground">{shipment.weightKg} kg</span>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-foreground">
                      {formatDate(shipment.createdAt)}
                    </td>
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null)
                              setEditForm(null)
                            }}
                            className="rounded-lg border border-border px-3 py-2 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailShipment(shipment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditor(shipment)}
                            disabled={shipment.status !== "pending"}
                            title={shipment.status !== "pending" ? "Only editable while pending" : undefined}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(shipment.id)}
                            disabled={deletingId === shipment.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === shipment.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Dialog
          open={!!detailShipment}
          onOpenChange={(open) => !open && setDetailShipment(null)}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
            <DialogHeader>
              <DialogTitle>Shipment details</DialogTitle>
              <DialogDescription>
                {detailShipment ? `Tracking # ${detailShipment.trackingNumber}` : ""}
              </DialogDescription>
            </DialogHeader>
            {detailShipment && (
              <>
                {/* Tracking timeline */}
                <div className="mb-4 flex justify-between gap-1 px-2">
                  {TRACKING_STEPS.map((s, i) => {
                    const activeIndex = trackingStepIndex(detailShipment.status)
                    const StepIcon = s.icon
                    return (
                      <div key={s.status} className="flex flex-1 flex-col items-center gap-2">
                        <div className="relative flex w-full items-center">
                          {i > 0 && (
                            <div
                              className={cn(
                                "absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2",
                                i <= activeIndex ? "bg-success" : "bg-border"
                              )}
                            />
                          )}
                          <div
                            className={cn(
                              "relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2",
                              i < activeIndex
                                ? "border-success/30 bg-success text-success-foreground"
                                : i === activeIndex
                                  ? "border-primary/30 bg-primary text-primary-foreground"
                                  : "border-muted bg-muted-foreground/20 text-muted-foreground"
                            )}
                          >
                            <StepIcon className="h-4 w-4" />
                          </div>
                        </div>
                        <span className="text-center text-[10px] text-muted-foreground">{s.label}</span>
                      </div>
                    )
                  })}
                </div>

                {detailShipment.status !== "arrived" && (
                  <button
                    onClick={() => handleAdvance(detailShipment.id)}
                    disabled={advancingId === detailShipment.id}
                    className="mb-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {advancingId === detailShipment.id
                      ? "Updating..."
                      : detailShipment.status === "pending"
                        ? "Mark as picked up"
                        : "Mark as delivered"}
                  </button>
                )}

                <dl className="grid gap-3 text-sm">
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">Tracking #</dt>
                    <dd className="font-mono text-xs">{detailShipment.trackingNumber}</dd>
                  </div>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">Sender</dt>
                    <dd>
                      <div className="font-medium">{detailShipment.senderName}</div>
                      <div className="text-muted-foreground">{detailShipment.senderLocation}</div>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">Receiver</dt>
                    <dd>
                      <div className="font-medium">{detailShipment.receiverName}</div>
                      <div className="text-muted-foreground">{detailShipment.receiverLocation}</div>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">Service</dt>
                    <dd>{getServiceTier(detailShipment.serviceTier)?.label ?? detailShipment.serviceTier}</dd>
                  </div>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">Package</dt>
                    <dd>
                      {detailShipment.lengthCm}×{detailShipment.widthCm}×{detailShipment.heightCm} cm ·{" "}
                      {detailShipment.weightKg} kg
                    </dd>
                  </div>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">Estimated cost</dt>
                    <dd>
                      {detailShipment.estimatedCost.toFixed(2)} {detailShipment.estimatedCurrency}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant="secondary">{detailShipment.status}</Badge>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd>{formatDate(detailShipment.createdAt)}</dd>
                  </div>
                </dl>
              </>
            )}
          </DialogContent>
        </Dialog>
        </>
      )}
    </div>
  )
}
