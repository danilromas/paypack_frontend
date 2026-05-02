"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Shipment, ShipmentPayload, ShipmentStatus } from "@/lib/shipments"

type SortDirection = "asc" | "desc"
type SortField = "date" | "receiver" | "sender" | "status"

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

function toPayload(shipment: Shipment): ShipmentPayload {
  return {
    senderName: shipment.senderName,
    senderLocation: shipment.senderLocation,
    receiverName: shipment.receiverName,
    receiverLocation: shipment.receiverLocation,
    service: shipment.service,
    dimensions: shipment.dimensions,
    weight: shipment.weight,
    status: shipment.status,
  }
}

export function ShipmentsTable({
  shipments,
  isLoading,
  onUpdate,
  onDelete,
}: {
  shipments: Shipment[]
  isLoading: boolean
  onUpdate: (id: string, payload: ShipmentPayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ShipmentPayload | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                {[
                  ["receiver", "Receiver"],
                  ["sender", "Sender"],
                  [null, "Service"],
                  [null, "Dimensions / Weight"],
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
                        <input
                          value={editForm.service}
                          onChange={(e) =>
                            setEditForm((prev) => prev && { ...prev, service: e.target.value })
                          }
                          className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                        />
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {shipment.service}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-foreground">
                      {isEditing ? (
                        <>
                          <input
                            value={editForm.dimensions}
                            onChange={(e) =>
                              setEditForm((prev) => prev && { ...prev, dimensions: e.target.value })
                            }
                            className="mb-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                          <input
                            value={editForm.weight}
                            onChange={(e) =>
                              setEditForm((prev) => prev && { ...prev, weight: e.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                          />
                        </>
                      ) : (
                        <>
                          {shipment.dimensions}
                          <br />
                          <span className="text-muted-foreground">{shipment.weight}</span>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editForm.status}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev && { ...prev, status: e.target.value as ShipmentStatus }
                            )
                          }
                          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                        >
                          <option value="pending">pending</option>
                          <option value="in-transit">in-transit</option>
                          <option value="arrived">arrived</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      )}
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditor(shipment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
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
      )}
    </div>
  )
}
