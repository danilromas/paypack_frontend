"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { EU_COUNTRIES, formatShipmentAddress, type ShipmentAddress, type ShipmentCreatePayload } from "@/lib/shipments"
import { SERVICE_TIERS, type ServiceTier } from "@/lib/shipping-rates"

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

interface Party extends ShipmentAddress {
  name: string
}

const EMPTY_PARTY: Party = { name: "", country: "", street: "", zip: "", city: "", phone: "", email: "" }

interface Quote {
  tier: ServiceTier
  priceGross: number
  currency: string
  estimatedDelivery: string | null
  minPickupDate: string | null
  pickupExcludedDates: string[]
}

function partyValid(p: Party) {
  return (
    p.name.trim() !== "" &&
    p.country !== "" &&
    p.street.trim() !== "" &&
    p.zip.trim() !== "" &&
    p.city.trim() !== "" &&
    /^\+?[\d\s()-]{6,20}$/.test(p.phone.trim()) &&
    /^\S+@\S+\.\S+$/.test(p.email.trim())
  )
}

function toAddress(p: Party): ShipmentAddress {
  return { country: p.country, street: p.street.trim(), zip: p.zip.trim(), city: p.city.trim(), phone: p.phone.trim(), email: p.email.trim() }
}

/** Eurosender reports transit time in business days ("1", "3-4"); our fallback estimate is already prose. */
function formatEta(eta: string | null) {
  if (!eta) return ""
  return /^\d+(-\d+)?$/.test(eta) ? `${eta} business day${eta === "1" ? "" : "s"}` : eta
}

function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** First day on or after `from` that isn't a weekend or in the courier's excluded list. */
function firstPickupDay(from: string, excluded: string[]) {
  const d = new Date(`${from}T12:00:00`)
  for (let i = 0; i < 60; i++) {
    const iso = localIsoDate(d)
    const day = d.getDay()
    if (day !== 0 && day !== 6 && !excluded.includes(iso)) return iso
    d.setDate(d.getDate() + 1)
  }
  return from
}

function PartyFields({ title, value, onChange }: { title: string; value: Party; onChange: (p: Party) => void }) {
  const set = (field: keyof Party) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [field]: e.target.value })
  return (
    <div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="mt-2 space-y-3">
        <input value={value.name} onChange={set("name")} placeholder="Full name" autoComplete="name" className={inputClass} />
        <select value={value.country} onChange={set("country")} className={cn(inputClass, !value.country && "text-muted-foreground")}>
          <option value="">Country (EU only)</option>
          {EU_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <input value={value.street} onChange={set("street")} placeholder="Street and house number" autoComplete="street-address" className={inputClass} />
        <div className="grid grid-cols-[2fr_3fr] gap-3">
          <input value={value.zip} onChange={set("zip")} placeholder="Postal code" autoComplete="postal-code" className={inputClass} />
          <input value={value.city} onChange={set("city")} placeholder="City" autoComplete="address-level2" className={inputClass} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={value.phone} onChange={set("phone")} placeholder="Phone, e.g. +372 5555 1234" type="tel" autoComplete="tel" className={inputClass} />
          <input value={value.email} onChange={set("email")} placeholder="Email" type="email" autoComplete="email" className={inputClass} />
        </div>
      </div>
    </div>
  )
}

export function NewShipmentWizard({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (payload: ShipmentCreatePayload) => Promise<void>
}) {
  const [step, setStep] = useState(1)
  const [sender, setSender] = useState<Party>(EMPTY_PARTY)
  const [receiver, setReceiver] = useState<Party>(EMPTY_PARTY)
  const [weightKg, setWeightKg] = useState<number | "">("")
  const [lengthCm, setLengthCm] = useState<number | "">("")
  const [widthCm, setWidthCm] = useState<number | "">("")
  const [heightCm, setHeightCm] = useState<number | "">("")
  const [contents, setContents] = useState("")
  const [declaredValue, setDeclaredValue] = useState<number | "">("")
  const [serviceTier, setServiceTier] = useState<ServiceTier | null>(null)
  const [pickupDate, setPickupDate] = useState("")
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [live, setLive] = useState(false)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotesError, setQuotesError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPhase = PHASES[step - 1]

  const routeValid = partyValid(sender) && partyValid(receiver)
  const packageValid =
    typeof weightKg === "number" &&
    weightKg > 0 &&
    typeof lengthCm === "number" &&
    lengthCm > 0 &&
    typeof widthCm === "number" &&
    widthCm > 0 &&
    typeof heightCm === "number" &&
    heightCm > 0 &&
    contents.trim() !== ""

  // Re-price whenever the user lands on Compare — they may have gone back and changed the route or box.
  useEffect(() => {
    if (currentPhase !== "compare" || !routeValid || !packageValid) return
    const controller = new AbortController()
    setQuotesLoading(true)
    setQuotesError(null)
    fetch("/api/shipments/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        senderName: sender.name.trim(),
        receiverName: receiver.name.trim(),
        senderAddress: toAddress(sender),
        receiverAddress: toAddress(receiver),
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        declaredValueEur: typeof declaredValue === "number" ? declaredValue : undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Could not get prices")
        setLive(Boolean(data.live))
        setQuotes(data.quotes ?? [])
        setServiceTier((prev) => (data.quotes ?? []).some((q: Quote) => q.tier === prev) ? prev : null)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setQuotes([])
        setQuotesError(err instanceof Error ? err.message : "Could not get prices")
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuotesLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase])

  const selectedQuote = quotes.find((q) => q.tier === serviceTier) ?? null
  const tierInfo = SERVICE_TIERS.find((t) => t.id === serviceTier)

  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return localIsoDate(d)
  })()
  const minPickup = selectedQuote?.minPickupDate && selectedQuote.minPickupDate > tomorrow ? selectedQuote.minPickupDate : tomorrow
  const excluded = selectedQuote?.pickupExcludedDates ?? []

  // Default the pickup to the first day the courier actually works once a service is chosen.
  useEffect(() => {
    if (!selectedQuote) return
    setPickupDate((prev) => (prev && prev >= minPickup && !excluded.includes(prev) ? prev : firstPickupDay(minPickup, excluded)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceTier, quotes])

  const pickupDay = pickupDate ? new Date(`${pickupDate}T12:00:00`).getDay() : null
  const pickupError = !pickupDate
    ? "Pick a pickup date."
    : pickupDate < minPickup
      ? "The courier can't collect that early."
      : pickupDay === 0 || pickupDay === 6 || excluded.includes(pickupDate)
        ? "The courier doesn't collect on that day — pick a working day."
        : null

  function canAdvanceFrom(phase: WizardPhase) {
    if (phase === "route") return routeValid
    if (phase === "package") return packageValid
    if (phase === "compare") return serviceTier !== null && !quotesLoading
    return true
  }

  async function handleCreate() {
    if (!packageValid || !serviceTier || pickupError) return
    setSubmitting(true)
    setError(null)
    const senderAddress = toAddress(sender)
    const receiverAddress = toAddress(receiver)
    try {
      await onCreate({
        senderName: sender.name.trim(),
        senderLocation: formatShipmentAddress(senderAddress),
        receiverName: receiver.name.trim(),
        receiverLocation: formatShipmentAddress(receiverAddress),
        senderAddress,
        receiverAddress,
        serviceTier,
        weightKg: weightKg as number,
        lengthCm: lengthCm as number,
        widthCm: widthCm as number,
        heightCm: heightCm as number,
        contents: contents.trim(),
        declaredValueEur: typeof declaredValue === "number" ? declaredValue : null,
        pickupDate,
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
                  <div className={cn("mx-2 h-0.5 w-4 sm:w-8", i + 1 < step ? "bg-[#5E90B4]" : "bg-border")} />
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
          <div className="mx-auto max-w-lg space-y-6">
            <PartyFields title="Sender — courier collects here" value={sender} onChange={setSender} />
            <PartyFields title="Receiver" value={receiver} onChange={setReceiver} />
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
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">What's inside</label>
              <input value={contents} onChange={(e) => setContents(e.target.value)} maxLength={100} placeholder="e.g. Used camera lens" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Declared value (€, optional)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value ? Number(e.target.value) : "")}
                placeholder="150"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Phase: Compare */}
        {currentPhase === "compare" && (
          <div className="mx-auto max-w-lg space-y-3">
            <h3 className="mb-1 font-semibold text-foreground">Choose a service</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              {live
                ? "Live carrier prices, door-to-door, VAT included."
                : "Internal estimate based on package size — not a live carrier rate."}
            </p>
            {quotesLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Getting prices...
              </div>
            )}
            {!quotesLoading && quotesError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{quotesError}</span>
              </div>
            )}
            {!quotesLoading && !quotesError && quotes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No carrier serves this route for this package.</p>
            )}
            {!quotesLoading &&
              quotes.map((quote) => {
                const tier = SERVICE_TIERS.find((t) => t.id === quote.tier)
                return (
                  <button
                    key={quote.tier}
                    type="button"
                    onClick={() => setServiceTier(quote.tier)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all",
                      serviceTier === quote.tier ? "border-[#5E90B4] bg-[#5E90B4]/10" : "border-border bg-card hover:border-[#5E90B4]/30",
                    )}
                  >
                    <div>
                      <div className="font-semibold text-foreground">{tier?.label ?? quote.tier}</div>
                      <div className="text-xs text-muted-foreground">{formatEta(quote.estimatedDelivery)}</div>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {quote.priceGross.toFixed(2)} {quote.currency === "EUR" ? "€" : quote.currency}
                    </div>
                  </button>
                )
              })}
          </div>
        )}

        {/* Phase: Review */}
        {currentPhase === "review" && (
          <div className="mx-auto max-w-lg">
            <h3 className="mb-4 text-center text-xl font-semibold text-foreground">Review shipment</h3>
            <div className="space-y-3 rounded-2xl border border-border bg-secondary p-6 text-left">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">From:</span>
                <span className="max-w-[70%] text-right font-medium text-foreground">
                  {sender.name} · {formatShipmentAddress(toAddress(sender))}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">To:</span>
                <span className="max-w-[70%] text-right font-medium text-foreground">
                  {receiver.name} · {formatShipmentAddress(toAddress(receiver))}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Package:</span>
                <span className="text-right font-medium text-foreground">
                  {contents.trim()} · {weightKg} kg · {lengthCm}×{widthCm}×{heightCm} cm
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">
                    {tierInfo?.label} ({formatEta(selectedQuote?.estimatedDelivery ?? null)}):
                  </span>
                  <span className="text-[#5E90B4]">{selectedQuote?.priceGross.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs text-muted-foreground">Pickup date — the courier collects from the sender's address</label>
              <input type="date" value={pickupDate} min={minPickup} onChange={(e) => setPickupDate(e.target.value)} className={inputClass} />
              {pickupError && <p className="mt-1 text-xs text-destructive">{pickupError}</p>}
            </div>

            {live && (
              <p className="mt-3 text-xs text-muted-foreground">
                Creating the shipment books a real courier. You'll get a shipping label to print and attach to the box.
              </p>
            )}
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={submitting || pickupError !== null}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5E90B4] py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {live ? "Booking courier..." : "Creating shipment..."}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {live ? "Book courier" : "Create shipment"}
                </>
              )}
            </button>
          </div>
        )}

        {currentPhase !== "review" && (
          <div className="mx-auto mt-6 flex max-w-lg items-center justify-end gap-3">
            {!canAdvanceFrom(currentPhase) && !quotesLoading && (
              <p className="text-xs text-destructive">
                {currentPhase === "route" && "Fill in full address, a valid phone and email for both sides."}
                {currentPhase === "package" && "Weight and dimensions must be greater than 0, and describe the contents."}
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
