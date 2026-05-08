"use client"

import { useState } from "react"
import { Check, ExternalLink, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShipmentPayload, ShipmentStatus } from "@/lib/shipments"

const statuses: ShipmentStatus[] = ["pending", "in-transit", "arrived"]

const initialForm: ShipmentPayload = {
  senderName: "Ivanov Ivan",
  senderLocation: "Moscow, Russia",
  receiverName: "Petrov Sergey",
  receiverLocation: "Saint Petersburg, Russia",
  service: "Express 24h",
  dimensions: "30x20x15 cm",
  weight: "2.5 kg",
  status: "pending",
}

export function NewShipmentWizard({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (payload: ShipmentPayload) => Promise<void>
}) {
  const [form, setForm] = useState<ShipmentPayload>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = <K extends keyof ShipmentPayload>(key: K, value: ShipmentPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onCreate(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shipment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex flex-col overflow-hidden rounded-none border-0 bg-card shadow-2xl sm:inset-8 sm:rounded-3xl sm:border sm:border-border">
        <div className="border-b border-border bg-secondary/30 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Create New Shipment</h2>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-5 overflow-auto p-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Sender</h3>
            <input
              value={form.senderName}
              onChange={(e) => updateField("senderName", e.target.value)}
              placeholder="Sender full name"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"
            />
            <input
              value={form.senderLocation}
              onChange={(e) => updateField("senderLocation", e.target.value)}
              placeholder="Sender location"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"
            />
            <h3 className="pt-2 font-semibold text-foreground">Receiver</h3>
            <input
              value={form.receiverName}
              onChange={(e) => updateField("receiverName", e.target.value)}
              placeholder="Receiver full name"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"
            />
            <input
              value={form.receiverLocation}
              onChange={(e) => updateField("receiverLocation", e.target.value)}
              placeholder="Receiver location"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Shipment</h3>
            <input
              value={form.service}
              onChange={(e) => updateField("service", e.target.value)}
              placeholder="Service name"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"
            />
            <input
              value={form.dimensions}
              onChange={(e) => updateField("dimensions", e.target.value)}
              placeholder="Dimensions (e.g. 30x20x15 cm)"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"
            />
            <input
              value={form.weight}
              onChange={(e) => updateField("weight", e.target.value)}
              placeholder="Weight (e.g. 2.5 kg)"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"
            />
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateField("status", status)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm capitalize transition-colors",
                      form.status === status
                        ? "border-[#5E90B4] bg-[#5E90B4]/10 text-[#5E90B4]"
                        : "border-border bg-secondary text-muted-foreground"
                    )}
                  >
                    {status.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-6">
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <a
            href="https://awallet.tech"
            target="_blank"
            rel="noreferrer"
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#1b74e4]/30 bg-[#1b74e4]/10 py-3 text-sm font-semibold text-[#1b74e4] transition-all hover:bg-[#1b74e4]/15"
          >
            <ExternalLink className="h-4 w-4" />
            Оплатить через криптотрансфер aWallet
          </a>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5E90B4] py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating shipment...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Create shipment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
