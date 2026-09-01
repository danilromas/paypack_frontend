"use client"

import { useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShipmentCreatePayload } from "@/lib/shipments"
import { SERVICE_TIERS, estimateShippingCost, type ServiceTier } from "@/lib/shipping-rates"

type WizardPhase = "route" | "package" | "compare" | "review"
const PHASES: WizardPhase[] = ["route", "package", "compare", "review"]
const PHASE_LABELS: Record<WizardPhase, string> = {
  route: "Route",
  package: "Package",
  compare: "Compare",
  review: "Review",
}

const inputClass =
  "w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#5E90B4]/40"

export function NewShipmentWizard({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (payload: ShipmentCreatePayload) => Promise<void>
}) {
  const [step, setStep] = useState(1)
  const [senderName, setSenderName] = useState("")
  const [senderLocation, setSenderLocation] = useState("")
  const [receiverName, setReceiverName] = useState("")
  const [receiverLocation, setReceiverLocation] = useState("")
  const [weightKg, setWeightKg] = useState<number | "">("")
  const [lengthCm, setLengthCm] = useState<number | "">("")
  const [widthCm, setWidthCm] = useState<number | "">("")
  const [heightCm, setHeightCm] = useState<number | "">("")
  const [serviceTier, setServiceTier] = useState<ServiceTier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPhase = PHASES[step - 1]

  const routeValid =
    senderName.trim().length > 0 &&
    senderLocation.trim().length > 0 &&
    receiverName.trim().length > 0 &&
    receiverLocation.trim().length > 0
  const packageValid =
    typeof weightKg === "number" &&
    weightKg > 0 &&
    typeof lengthCm === "number" &&
    lengthCm > 0 &&
    typeof widthCm === "number" &&
    widthCm > 0 &&
    typeof heightCm === "number" &&
    heightCm > 0

  const quotes = useMemo(() => {
    if (!packageValid) return []
    const pkg = { weightKg: weightKg as number, lengthCm: lengthCm as number, widthCm: widthCm as number, heightCm: heightCm as number }
    return SERVICE_TIERS.map((tier) => ({ tier, cost: estimateShippingCost(pkg, tier) }))
  }, [packageValid, weightKg, lengthCm, widthCm, heightCm])

  const selectedQuote = quotes.find((q) => q.tier.id === serviceTier) ?? null

  function canAdvanceFrom(phase: WizardPhase) {
    if (phase === "route") return routeValid
    if (phase === "package") return packageValid
    if (phase === "compare") return serviceTier !== null
    return true
  }

  async function handleCreate() {
    if (!packageValid || !serviceTier) return
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        senderName: senderName.trim(),
        senderLocation: senderLocation.trim(),
        receiverName: receiverName.trim(),
        receiverLocation: receiverLocation.trim(),
        serviceTier,
        weightKg: weightKg as number,
        lengthCm: lengthCm as number,
        widthCm: widthCm as number,
        heightCm: heightCm as number,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shipment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-0 backdrop-blur-sm sm:p-4">
      <div className="h-full w-full overflow-y-auto rounded-none border-0 bg-card p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl sm:border sm:border-border sm:p-8">
        {/* Header with integrated progress */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {PHASES.map((phase, i) => (
              <div key={phase} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                    i + 1 <= step ? "bg-[#5E90B4] text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <span className={cn("hidden text-sm sm:block", i + 1 <= step ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {PHASE_LABELS[phase]}
                </span>
                {i < PHASES.length - 1 && (
                  <div className={cn("mx-2 h-0.5 w-8", i + 1 < step ? "bg-[#5E90B4]" : "bg-border")} />
                )}
              </div>
            ))}
          </div>

          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Phase: Route */}
        {currentPhase === "route" && (
          <div className="mx-auto max-w-lg space-y-5">
            <div>
              <h3 className="font-semibold text-foreground">Sender</h3>
              <div className="mt-2 space-y-3">
                <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Full name" className={inputClass} />
                <input value={senderLocation} onChange={(e) => setSenderLocation(e.target.value)} placeholder="City, country" className={inputClass} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Receiver</h3>
              <div className="mt-2 space-y-3">
                <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Full name" className={inputClass} />
                <input value={receiverLocation} onChange={(e) => setReceiverLocation(e.target.value)} placeholder="City, country" className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* Phase: Package */}
        {currentPhase === "package" && (
          <div className="mx-auto max-w-lg space-y-4">
            <h3 className="font-semibold text-foreground">Package details</h3>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Weight (kg)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : "")}
                placeholder="2.5"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Dimensions (cm)</label>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" min={0} step={0.1} value={lengthCm} onChange={(e) => setLengthCm(e.target.value ? Number(e.target.value) : "")} placeholder="L" className={inputClass} />
                <input type="number" min={0} step={0.1} value={widthCm} onChange={(e) => setWidthCm(e.target.value ? Number(e.target.value) : "")} placeholder="W" className={inputClass} />
                <input type="number" min={0} step={0.1} value={heightCm} onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : "")} placeholder="H" className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* Phase: Compare */}
        {currentPhase === "compare" && (
          <div className="mx-auto max-w-lg space-y-3">
            <h3 className="mb-1 font-semibold text-foreground">Choose a service</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Internal estimate based on package size — not a live carrier rate.
            </p>
            {quotes.map(({ tier, cost }) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setServiceTier(tier.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all",
                  serviceTier === tier.id ? "border-[#5E90B4] bg-[#5E90B4]/10" : "border-border bg-card hover:border-[#5E90B4]/30",
                )}
              >
                <div>
                  <div className="font-semibold text-foreground">{tier.label}</div>
                  <div className="text-xs text-muted-foreground">{tier.eta}</div>
                </div>
                <div className="text-lg font-bold text-foreground">{cost.toFixed(2)} €</div>
              </button>
            ))}
          </div>
        )}

        {/* Phase: Review */}
        {currentPhase === "review" && (
          <div className="mx-auto max-w-lg">
            <h3 className="mb-4 text-center text-xl font-semibold text-foreground">Review shipment</h3>
            <div className="space-y-3 rounded-2xl border border-border bg-secondary p-6 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">From:</span>
                <span className="max-w-[65%] text-right font-medium text-foreground">{senderName} · {senderLocation}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="max-w-[65%] text-right font-medium text-foreground">{receiverName} · {receiverLocation}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Package:</span>
                <span className="font-medium text-foreground">{weightKg} kg · {lengthCm}×{widthCm}×{heightCm} cm</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">{selectedQuote?.tier.label} ({selectedQuote?.tier.eta}):</span>
                  <span className="text-[#5E90B4]">{selectedQuote?.cost.toFixed(2)} €</span>
                </div>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5E90B4] py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
        )}

        {currentPhase !== "review" && (
          <div className="mx-auto mt-6 flex max-w-lg items-center justify-end gap-3">
            {!canAdvanceFrom(currentPhase) && (
              <p className="text-xs text-destructive">
                {currentPhase === "route" && "Fill in sender and receiver."}
                {currentPhase === "package" && "Weight and all dimensions must be greater than 0."}
                {currentPhase === "compare" && "Pick a service to continue."}
              </p>
            )}
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvanceFrom(currentPhase)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5E90B4] text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
