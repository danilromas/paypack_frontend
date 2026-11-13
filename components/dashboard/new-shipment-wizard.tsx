"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  ChevronRight,
  FileText,
  Home,
  Lock,
  MapPinned,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DESTINATION_COUNTRIES,
  EU_COUNTRIES,
  EXPORT_REASONS,
  ORIGIN_COUNTRIES,
  formatShipmentAddress,
  needsCustoms,
  needsState,
  type DeliveryMode,
  type ExportReason,
  type ServicePointSummary,
  type ShipmentAddress,
  type ShipmentCreatePayload,
} from "@/lib/shipments"
import { SERVICE_TIERS, type ServiceTier } from "@/lib/shipping-rates"
import { useAppStore } from "@/store/app-store"
import {
  clearShipmentDraft,
  isDraftWorthKeeping,
  readShipmentDraft,
  writeShipmentDraft,
  type ShipmentDraft,
} from "@/components/dashboard/shipment-draft"

/** Price first (postcodes + box), then the addresses and contents, then pickup and booking. */
type WizardPhase = "price" | "details" | "review"
const PHASES: WizardPhase[] = ["price", "details", "review"]
const PHASE_LABELS: Record<WizardPhase, string> = {
  price: "Price",
  details: "Details",
  review: "Review",
}

/** Common box sizes so most people never type dimensions. */
const PACKAGE_PRESETS = [
  { label: "Envelope", weightKg: 0.5, lengthCm: 35, widthCm: 25, heightCm: 3 },
  { label: "Small box", weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 15 },
  { label: "Medium box", weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 25 },
  { label: "Large box", weightKg: 10, lengthCm: 60, widthCm: 40, heightCm: 40 },
]

const TIER_ICONS: Record<ServiceTier, LucideIcon> = {
  economy: Package,
  standard: Truck,
  express: Zap,
}

const inputClass =
  "w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ship/40"

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
  /** Sendcloud names the carrier up front; Eurosender assigns one after booking. */
  carrierName?: string | null
  carrierCode?: string | null
  /** Eurosender quotes are always door delivery. */
  delivery?: DeliveryMode
  /** The sender takes the parcel to a locker or shop instead of a courier collecting it. */
  dropOff?: boolean
}

/** One card per tier and delivery mode — a tier can have both a door and a pickup point option. */
function quoteKey(q: Quote) {
  return `${q.tier}:${q.delivery ?? "home"}`
}

function formatDistance(m: number | null) {
  if (m === null) return ""
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

function partyValid(p: Party) {
  return (
    (!needsState(p.country) || /^[A-Za-z]{2}$/.test((p.state ?? "").trim())) &&
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
  return {
    country: p.country,
    street: p.street.trim(),
    zip: p.zip.trim(),
    city: p.city.trim(),
    phone: p.phone.trim(),
    email: p.email.trim(),
    ...(needsState(p.country) ? { state: (p.state ?? "").trim().toUpperCase() } : {}),
  }
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

/** HS codes people shipping bags reach for most; any 6–10 digit code is accepted. */
const HS_CODE_HINTS = [
  { code: "420221", label: "Handbags, leather" },
  { code: "420222", label: "Handbags, textile or plastic" },
  { code: "420231", label: "Wallets & small leather goods" },
  { code: "420292", label: "Travel & sports bags, textile" },
]

function PartyFields({
  title,
  hint,
  icon: Icon,
  value,
  onChange,
  countries,
  onChangeLocation,
}: {
  title: string
  hint: string
  icon: LucideIcon
  value: Party
  onChange: (p: Party) => void
  countries: { code: string; name: string }[]
  /** Country and postcode were set on the price step; changing them means re-pricing there. */
  onChangeLocation: () => void
}) {
  const set = (field: keyof Party) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [field]: e.target.value })
  const done = partyValid(value)
  return (
    <div className={cn("rounded-2xl border bg-card/60 p-4 transition-colors sm:p-5", done ? "border-ship/30" : "border-border")}>
      <div className="mb-4 flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", done ? "bg-success/10 text-success" : "bg-ship/10 text-ship")}>
          {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm">
          <span className="min-w-0 truncate text-foreground">
            {countries.find((c) => c.code === value.country)?.name ?? value.country} · {value.zip}
            {value.state ? ` · ${value.state.toUpperCase()}` : ""}
          </span>
          <button type="button" onClick={onChangeLocation} className="shrink-0 text-xs font-medium text-ship hover:underline">
            Change
          </button>
        </div>
        <input value={value.name} onChange={set("name")} placeholder="Full name" autoComplete="name" className={inputClass} />
        <input value={value.street} onChange={set("street")} placeholder="Street and house number" autoComplete="street-address" className={inputClass} />
        <input value={value.city} onChange={set("city")} placeholder="City" autoComplete="address-level2" className={inputClass} />
        <div className="grid gap-3">
          <input value={value.phone} onChange={set("phone")} placeholder="Phone, e.g. +372 5555 1234" type="tel" autoComplete="tel" className={inputClass} />
          <input value={value.email} onChange={set("email")} placeholder="Email" type="email" autoComplete="email" className={inputClass} />
        </div>
      </div>
    </div>
  )
}

function LocationFields({
  title,
  icon: Icon,
  value,
  onChange,
  countries,
  countryPlaceholder,
}: {
  title: string
  icon: LucideIcon
  value: Party
  onChange: (p: Party) => void
  countries: { code: string; name: string }[]
  countryPlaceholder: string
}) {
  const set = (field: keyof Party) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [field]: e.target.value })
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
        <Icon className="h-4 w-4 text-ship" />
        {title}
      </div>
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <select value={value.country} onChange={set("country")} aria-label={`${title} country`} className={cn(inputClass, !value.country && "text-muted-foreground")}>
          <option value="">{countryPlaceholder}</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <input value={value.zip} onChange={set("zip")} placeholder="Postcode" aria-label={`${title} postcode`} autoComplete="postal-code" className={inputClass} />
      </div>
      {needsState(value.country) && (
        <input
          value={value.state ?? ""}
          onChange={set("state")}
          placeholder="State, 2 letters (e.g. WA)"
          maxLength={2}
          autoComplete="address-level1"
          className={cn(inputClass, "mt-3")}
        />
      )}
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
  const userId = useAppStore((s) => s.user?.id ?? null)
  // Picks up where the last unfinished shipment stopped; read once, when the wizard opens.
  const [draft] = useState<ShipmentDraft | null>(() => readShipmentDraft(userId))
  const [draftNotice, setDraftNotice] = useState(draft !== null)
  // A resumed draft reopens on the price step: prices are fetched live there, and the service picked
  // last time stays selected if couriers still offer it. Everything after it is already filled in.
  const [step, setStep] = useState(1)
  const [bookingPassword, setBookingPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)
  const [accessChecking, setAccessChecking] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [sender, setSender] = useState<Party>(draft?.sender ?? EMPTY_PARTY)
  const [receiver, setReceiver] = useState<Party>(draft?.receiver ?? EMPTY_PARTY)
  const [weightKg, setWeightKg] = useState<number | "">(draft?.weightKg ?? "")
  const [lengthCm, setLengthCm] = useState<number | "">(draft?.lengthCm ?? "")
  const [widthCm, setWidthCm] = useState<number | "">(draft?.widthCm ?? "")
  const [heightCm, setHeightCm] = useState<number | "">(draft?.heightCm ?? "")
  const [contents, setContents] = useState(draft?.contents ?? "")
  const [declaredValue, setDeclaredValue] = useState<number | "">(draft?.declaredValue ?? "")
  const [hsCode, setHsCode] = useState(draft?.hsCode ?? "")
  const [originCountry, setOriginCountry] = useState(draft?.originCountry ?? "IT")
  const [itemCount, setItemCount] = useState<number | "">(draft?.itemCount ?? 1)
  const [exportReason, setExportReason] = useState<ExportReason>(draft?.exportReason ?? "commercial_goods")
  const [senderVat, setSenderVat] = useState(draft?.senderVat ?? "")
  const [selectedKey, setSelectedKey] = useState<string | null>(draft?.selectedKey ?? null)
  const [points, setPoints] = useState<ServicePointSummary[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [servicePointId, setServicePointId] = useState<string | null>(null)
  const [pickupDate, setPickupDate] = useState(draft?.pickupDate ?? "")
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [live, setLive] = useState(false)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotesError, setQuotesError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPhase = PHASES[step - 1]

  const locationValid = (p: Party) => p.country !== "" && p.zip.trim() !== ""
  const routeLocated =
    locationValid(sender) &&
    locationValid(receiver) &&
    (!needsState(receiver.country) || /^[A-Za-z]{2}$/.test((receiver.state ?? "").trim()))
  const sizeValid =
    typeof weightKg === "number" &&
    weightKg > 0 &&
    typeof lengthCm === "number" &&
    lengthCm > 0 &&
    typeof widthCm === "number" &&
    widthCm > 0 &&
    typeof heightCm === "number" &&
    heightCm > 0
  /** Enough to ask couriers for prices: two postcodes and a box. */
  const quickValid = routeLocated && sizeValid
  const isCustoms = needsCustoms(receiver.country)
  const customsValid =
    !isCustoms ||
    (typeof declaredValue === "number" &&
      declaredValue > 0 &&
      /^\d{6,10}$/.test(hsCode.replace(/[\s.]/g, "")) &&
      originCountry !== "" &&
      typeof itemCount === "number" &&
      Number.isInteger(itemCount) &&
      itemCount >= 1 &&
      (senderVat.trim() === "" || /^[A-Za-z]{2}[A-Za-z0-9]{2,13}$/.test(senderVat.replace(/\s/g, ""))))
  const detailsValid = partyValid(sender) && partyValid(receiver) && contents.trim() !== "" && customsValid
  const readyToBook = quickValid && detailsValid

  // Prices follow the postcodes and the box: re-quote shortly after either changes.
  const quoteInputs = JSON.stringify([
    sender.country,
    sender.zip.trim(),
    receiver.country,
    receiver.zip.trim(),
    (receiver.state ?? "").trim().toUpperCase(),
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
  ])
  useEffect(() => {
    if (currentPhase !== "price" || !accessGranted) return
    if (!quickValid) {
      setQuotes([])
      setQuotesError(null)
      setQuotesLoading(false)
      return
    }
    const controller = new AbortController()
    setQuotesLoading(true)
    setQuotesError(null)
    const quoteAddress = (p: Party) => ({
      country: p.country,
      zip: p.zip.trim(),
      ...(needsState(p.country) ? { state: (p.state ?? "").trim().toUpperCase() } : {}),
    })
    const timer = setTimeout(() => {
      fetch("/api/shipments/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          senderAddress: quoteAddress(sender),
          receiverAddress: quoteAddress(receiver),
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
          setSelectedKey((prev) => (((data.quotes ?? []) as Quote[]).some((q) => quoteKey(q) === prev) ? prev : null))
        })
        .catch((err) => {
          if (controller.signal.aborted) return
          setQuotes([])
          setQuotesError(err instanceof Error ? err.message : "Could not get prices")
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuotesLoading(false)
        })
    }, 500)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, quoteInputs, accessGranted])

  // Keep the unfinished shipment in this browser; it's cleared once the shipment is booked.
  const draftRef = useRef<Omit<ShipmentDraft, "v" | "savedAt"> | null>(null)
  draftRef.current = {
    step,
    sender,
    receiver,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    contents,
    declaredValue,
    hsCode,
    originCountry,
    itemCount,
    exportReason,
    senderVat,
    selectedKey,
    pickupDate,
  }
  const draftSignature = JSON.stringify(draftRef.current)
  useEffect(() => {
    if (!accessGranted) return
    const timer = setTimeout(() => {
      const current = draftRef.current
      if (current && isDraftWorthKeeping(current)) {
        writeShipmentDraft(userId, { v: 1, savedAt: new Date().toISOString(), ...current })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [draftSignature, accessGranted, userId])

  function startOver() {
    clearShipmentDraft(userId)
    setDraftNotice(false)
    setStep(1)
    setSender(EMPTY_PARTY)
    setReceiver(EMPTY_PARTY)
    setWeightKg("")
    setLengthCm("")
    setWidthCm("")
    setHeightCm("")
    setContents("")
    setDeclaredValue("")
    setHsCode("")
    setOriginCountry("IT")
    setItemCount(1)
    setExportReason("commercial_goods")
    setSenderVat("")
    setSelectedKey(null)
    setPickupDate("")
    setServicePointId(null)
    setError(null)
  }

  const selectedQuote = quotes.find((q) => quoteKey(q) === selectedKey) ?? null
  const serviceTier = selectedQuote?.tier ?? null
  const isPoint = selectedQuote?.delivery === "point"
  const selectedPoint = points.find((p) => p.id === servicePointId) ?? null
  const tierInfo = SERVICE_TIERS.find((t) => t.id === serviceTier)
  const phaseWidth = currentPhase === "review" ? "max-w-xl" : "max-w-3xl"
  const cheapestQuote = quotes.reduce<Quote | null>((best, q) => (!best || q.priceGross < best.priceGross ? q : best), null)
  // Eurosender reports days as "1" or "3-4" — compare on the upper bound.
  const etaDays = (q: Quote) => Number((q.estimatedDelivery ?? "").split("-").pop()) || Number.POSITIVE_INFINITY
  const fastestQuote = quotes.reduce<Quote | null>((best, q) => (!best || etaDays(q) < etaDays(best) ? q : best), null)

  // Lockers near the receiver, for the carrier of the chosen pickup point option.
  useEffect(() => {
    if (currentPhase !== "review" || !isPoint || !selectedQuote?.carrierCode) return
    const controller = new AbortController()
    setPointsLoading(true)
    setPointsError(null)
    const params = new URLSearchParams({
      carrier: selectedQuote.carrierCode,
      country: receiver.country,
      zip: receiver.zip.trim(),
      city: receiver.city.trim(),
      street: receiver.street.trim(),
    })
    fetch(`/api/shipments/service-points/?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Could not load pickup points")
        const found = (data.points ?? []) as ServicePointSummary[]
        setPoints(found)
        setServicePointId((prev) => (found.some((p) => p.id === prev) ? prev : null))
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setPoints([])
        setPointsError(err instanceof Error ? err.message : "Could not load pickup points")
      })
      .finally(() => {
        if (!controller.signal.aborted) setPointsLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, selectedKey])

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
  }, [selectedKey, quotes])

  const pickupDay = pickupDate ? new Date(`${pickupDate}T12:00:00`).getDay() : null
  const pickupError = !pickupDate
    ? "Pick a pickup date."
    : pickupDate < minPickup
      ? "The courier can't collect that early."
      : pickupDay === 0 || pickupDay === 6 || excluded.includes(pickupDate)
        ? "The courier doesn't collect on that day — pick a working day."
        : null

  function canAdvanceFrom(phase: WizardPhase) {
    if (phase === "price") return quickValid && selectedQuote !== null && !quotesLoading
    if (phase === "details") return detailsValid
    return true
  }

  async function checkAccess(e: React.FormEvent) {
    e.preventDefault()
    setAccessChecking(true)
    setAccessError(null)
    try {
      const res = await fetch("/api/shipments/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: bookingPassword }),
      })
      if (res.ok) {
        setAccessGranted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setAccessError(data.error ?? "Could not check the password")
      }
    } catch {
      setAccessError("Could not check the password")
    } finally {
      setAccessChecking(false)
    }
  }

  async function handleCreate() {
    if (!readyToBook || !serviceTier || pickupError || (isPoint && !servicePointId)) return
    setSubmitting(true)
    setError(null)
    const senderAddress = toAddress(sender)
    const receiverAddress = toAddress(receiver)
    try {
      await onCreate({
        bookingPassword,
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
        customs: isCustoms
          ? {
              hsCode: hsCode.replace(/[\s.]/g, ""),
              originCountry,
              quantity: itemCount as number,
              exportReason,
              senderVatNumber: senderVat.trim() || null,
            }
          : null,
        pickupDate,
        delivery: isPoint ? "point" : "home",
        servicePointId: isPoint ? servicePointId : null,
      })
      clearShipmentDraft(userId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shipment")
    } finally {
      setSubmitting(false)
    }
  }

  if (!accessGranted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
        <form onSubmit={checkAccess} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ship/10 text-ship">
              <Lock className="h-5 w-5" />
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <h3 className="font-semibold text-foreground">New shipments are invite-only for now</h3>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Enter the booking password to continue. Your existing shipments stay available as usual.</p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={bookingPassword}
              onChange={(e) => setBookingPassword(e.target.value)}
              placeholder="Booking password"
              autoComplete="off"
              autoFocus
              className={cn(inputClass, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {accessError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{accessError}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={accessChecking || bookingPassword === ""}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ship py-3 font-semibold text-ship-foreground shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {accessChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-0 backdrop-blur-sm sm:p-4">
      <div className="h-full w-full overflow-y-auto rounded-none border-0 bg-card p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-border sm:p-8">
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
                    i + 1 <= step ? "bg-ship text-ship-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <span className={cn("hidden text-sm sm:block", i + 1 <= step ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {PHASE_LABELS[phase]}
                </span>
                {i < PHASES.length - 1 && (
                  <div className={cn("mx-2 h-0.5 w-4 sm:w-8", i + 1 < step ? "bg-ship" : "bg-border")} />
                )}
              </div>
            ))}
          </div>

          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {draftNotice && (
          <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-ship/30 bg-ship/10 px-4 py-2.5 text-sm">
            <span className="text-foreground">Continuing your unfinished shipment.</span>
            <button type="button" onClick={startOver} className="shrink-0 text-xs font-medium text-ship hover:underline">
              Start over
            </button>
          </div>
        )}

        {/* Phase: Price — two postcodes and a box are enough to compare couriers */}
        {currentPhase === "price" && (
          <div className={cn("mx-auto space-y-4", phaseWidth)}>
            <div className="grid gap-4 md:grid-cols-2">
              <LocationFields
                title="From"
                icon={MapPin}
                value={sender}
                onChange={setSender}
                countries={EU_COUNTRIES}
                countryPlaceholder="Country (EU only)"
              />
              <LocationFields
                title="To"
                icon={Home}
                value={receiver}
                onChange={setReceiver}
                countries={DESTINATION_COUNTRIES}
                countryPlaceholder="Country"
              />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ship/10 text-ship">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Size & weight</h3>
                  <p className="text-xs text-muted-foreground">Pick a typical box or enter exact numbers — round up, not down.</p>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PACKAGE_PRESETS.map((p) => {
                  const active = weightKg === p.weightKg && lengthCm === p.lengthCm && widthCm === p.widthCm && heightCm === p.heightCm
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setWeightKg(p.weightKg)
                        setLengthCm(p.lengthCm)
                        setWidthCm(p.widthCm)
                        setHeightCm(p.heightCm)
                      }}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 text-left transition-all",
                        active ? "border-ship bg-ship/10" : "border-border bg-card hover:border-ship/30",
                      )}
                    >
                      <div className="text-sm font-medium text-foreground">{p.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        up to {p.weightKg} kg · {p.lengthCm}×{p.widthCm}×{p.heightCm}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-[1fr_3fr] gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Weight, kg</label>
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
                  <label className="mb-1 block text-xs text-muted-foreground">Length × width × height, cm</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min={0} step={0.1} value={lengthCm} onChange={(e) => setLengthCm(e.target.value ? Number(e.target.value) : "")} placeholder="L" className={inputClass} />
                    <input type="number" min={0} step={0.1} value={widthCm} onChange={(e) => setWidthCm(e.target.value ? Number(e.target.value) : "")} placeholder="W" className={inputClass} />
                    <input type="number" min={0} step={0.1} value={heightCm} onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : "")} placeholder="H" className={inputClass} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-foreground">Choose a service</h3>
              {!quotesLoading && quotes.length > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    live ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {live ? "Live prices" : "Estimate"}
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {quotesLoading
                ? "Asking couriers for prices…"
                : live
                ? `To the door or a pickup point. VAT included${isCustoms ? "; import taxes and duties are paid by the recipient" : ""}.`
                : "Internal estimate based on package size — not a live carrier rate."}
            </p>
            {quickValid && quotesLoading &&
              [0, 1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-2xl border border-border bg-card" />)}
            {!quotesLoading && quotesError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{quotesError}</span>
              </div>
            )}
            {!quickValid && (
              <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Enter both postcodes and the box size — prices show up here.
              </p>
            )}
            {quickValid && !quotesLoading && !quotesError && quotes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No carrier serves this route for this package.</p>
            )}
            {!quotesLoading &&
              quotes.map((quote) => {
                const tier = SERVICE_TIERS.find((t) => t.id === quote.tier)
                const toPoint = quote.delivery === "point"
                const TierIcon = toPoint ? MapPinned : TIER_ICONS[quote.tier]
                const key = quoteKey(quote)
                const selected = selectedKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all sm:px-5",
                      selected ? "border-ship bg-ship/10" : "border-border bg-card hover:border-ship/30",
                    )}
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", selected ? "bg-ship text-ship-foreground" : "bg-ship/10 text-ship")}>
                      <TierIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{tier?.label ?? quote.tier}</span>
                        {toPoint && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Pickup point</span>
                        )}
                        {quotes.length > 1 && cheapestQuote && key === quoteKey(cheapestQuote) && (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success">Cheapest</span>
                        )}
                        {quotes.length > 1 && fastestQuote && key === quoteKey(fastestQuote) && Number.isFinite(etaDays(quote)) && (
                          <span className="rounded-full bg-ship/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ship">Fastest</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[
                          quote.carrierName,
                          formatEta(quote.estimatedDelivery),
                          toPoint ? "receiver collects from a locker or pickup point" : null,
                          quote.dropOff ? "you drop it off" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="shrink-0 text-lg font-bold text-foreground">
                      {quote.priceGross.toFixed(2)} {quote.currency === "EUR" ? "€" : quote.currency}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Phase: Details — who sends, who receives, what's inside */}
        {currentPhase === "details" && (
          <div className={cn("mx-auto space-y-4", phaseWidth)}>
            <div className="grid gap-4 md:grid-cols-2">
              <PartyFields
                title="From"
                hint="The courier collects here"
                icon={MapPin}
                value={sender}
                onChange={setSender}
                countries={EU_COUNTRIES}
                onChangeLocation={() => setStep(1)}
              />
              <PartyFields
                title="To"
                hint={isPoint ? "Collects the parcel at a pickup point" : "Delivered to the door"}
                icon={Home}
                value={receiver}
                onChange={setReceiver}
                countries={DESTINATION_COUNTRIES}
                onChangeLocation={() => setStep(1)}
              />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ship/10 text-ship">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Contents</h3>
                  <p className="text-xs text-muted-foreground">Printed on the carrier paperwork. Value sets the liability cover.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">What's inside</label>
                  <input value={contents} onChange={(e) => setContents(e.target.value)} maxLength={100} placeholder="e.g. Used camera lens" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{isCustoms ? "Total value, €" : "Value, € (optional)"}</label>
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
            </div>

            {isCustoms && (
              <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ship/10 text-ship">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Customs</h3>
                    <p className="text-xs text-muted-foreground">
                      The destination is outside the EU — this goes on the customs documents. Import taxes and duties are paid by the recipient.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">HS code</label>
                    <input value={hsCode} onChange={(e) => setHsCode(e.target.value)} inputMode="numeric" maxLength={14} placeholder="420221" className={inputClass} />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {HS_CODE_HINTS.map((h) => (
                        <button
                          key={h.code}
                          type="button"
                          onClick={() => setHsCode(h.code)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                            hsCode === h.code ? "border-ship bg-ship/10 text-foreground" : "border-border text-muted-foreground hover:border-ship/30",
                          )}
                        >
                          {h.label} · {h.code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Made in</label>
                    <select value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} className={inputClass}>
                      {ORIGIN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Number of items</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={itemCount}
                      onChange={(e) => setItemCount(e.target.value ? Number(e.target.value) : "")}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Reason</label>
                    <select value={exportReason} onChange={(e) => setExportReason(e.target.value as ExportReason)} className={inputClass}>
                      {EXPORT_REASONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Sender VAT number (businesses only, optional)</label>
                    <input value={senderVat} onChange={(e) => setSenderVat(e.target.value)} maxLength={20} placeholder="IT12345678901" className={inputClass} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase: Review */}
        {currentPhase === "review" && (
          <div className={cn("mx-auto", phaseWidth)}>
            <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">From</div>
                  <div className="truncate text-sm font-semibold text-foreground">{sender.name}</div>
                  <div className="text-xs text-muted-foreground">{formatShipmentAddress(toAddress(sender))}</div>
                </div>
                <div className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-ship/10 text-ship">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-right">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">To</div>
                  <div className="truncate text-sm font-semibold text-foreground">{receiver.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {isPoint
                      ? selectedPoint
                        ? `${selectedPoint.carrierName} · ${selectedPoint.street}, ${selectedPoint.zip} ${selectedPoint.city}`
                        : "Pickup point — choose below"
                      : formatShipmentAddress(toAddress(receiver))}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Package</div>
                  <div className="font-medium text-foreground">{contents.trim()}</div>
                  <div className="text-xs text-muted-foreground">
                    {weightKg} kg · {lengthCm}×{widthCm}×{heightCm} cm
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Service</div>
                  <div className="font-medium text-foreground">{tierInfo?.label}</div>
                  <div className="text-xs text-muted-foreground">{formatEta(selectedQuote?.estimatedDelivery ?? null)}</div>
                </div>
              </div>
              {isCustoms && (
                <div className="mt-4 border-t border-border pt-4 text-sm">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Customs</div>
                  <div className="font-medium text-foreground">
                    {itemCount} × HS {hsCode.replace(/[\s.]/g, "")} · made in {ORIGIN_COUNTRIES.find((c) => c.code === originCountry)?.name ?? originCountry}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {EXPORT_REASONS.find((r) => r.id === exportReason)?.label} · {typeof declaredValue === "number" ? declaredValue : 0} € ·{" "}
                    {senderVat.trim() ? `commercial export, VAT ${senderVat.trim().toUpperCase()}` : "private export"} · duties paid by the recipient
                  </div>
                </div>
              )}
            </div>

            {isPoint && (
              <div className="mt-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPinned className="h-4 w-4 text-ship" />
                  Pickup point near the receiver
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {selectedQuote?.carrierName} delivers here and notifies the receiver, who collects it with a code.
                </p>
                {pointsLoading && [0, 1, 2].map((i) => <div key={i} className="mb-2 h-14 animate-pulse rounded-xl border border-border bg-card" />)}
                {!pointsLoading && pointsError && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{pointsError}</span>
                  </div>
                )}
                {!pointsLoading && !pointsError && points.length === 0 && (
                  <p className="py-3 text-center text-sm text-muted-foreground">No pickup points near this address — pick door delivery instead.</p>
                )}
                {!pointsLoading && points.length > 0 && (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {points.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setServicePointId(p.id)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-xl border-2 px-3 py-2 text-left text-sm transition-all",
                          servicePointId === p.id ? "border-ship bg-ship/10" : "border-border bg-card hover:border-ship/30",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{p.name || p.carrierName}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.street}, {p.zip} {p.city}
                            {p.shopType ? ` · ${p.shopType}` : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">{formatDistance(p.distanceM)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarDays className="h-4 w-4 text-ship" />
                Pickup date
              </label>
              <input type="date" value={pickupDate} min={minPickup} onChange={(e) => setPickupDate(e.target.value)} className={inputClass} />
              <p className={cn("mt-1 text-xs", pickupError ? "text-destructive" : "text-muted-foreground")}>
                {pickupError ??
                  (selectedQuote?.dropOff
                    ? "You take the parcel to a locker or drop-off point — any working day from this date."
                    : "The courier collects from the sender's door during working hours.")}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-ship/30 bg-ship/10 px-4 py-4 sm:px-5">
              <div>
                <div className="text-sm font-semibold text-foreground">Total</div>
                <div className="text-xs text-muted-foreground">{live ? "VAT included" : "Internal estimate"}</div>
              </div>
              <div className="text-2xl font-bold text-ship">{selectedQuote?.priceGross.toFixed(2)} €</div>
            </div>

            {live && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Booking calls a real courier. You'll get a label to print and stick on the box
                {isCustoms ? ", plus customs documents to attach to it" : ""}.
              </p>
            )}
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={submitting || pickupError !== null || (isPoint && !servicePointId)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ship py-3 font-semibold text-ship-foreground shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className={cn("mx-auto mt-6 flex items-center justify-between gap-3", phaseWidth)}>
            <p className="text-xs text-muted-foreground">
              {!canAdvanceFrom(currentPhase) && !quotesLoading
                ? currentPhase === "price"
                  ? quickValid
                    ? "Pick a price to continue."
                    : "Enter both postcodes and the box size."
                  : isCustoms
                    ? "Fill in both addresses with a valid phone and email, the contents and the customs details."
                    : "Fill in both addresses with a valid phone and email, and the contents."
                : `Step ${step} of ${PHASES.length}`}
            </p>
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvanceFrom(currentPhase)}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-ship px-5 py-2.5 text-sm font-semibold text-ship-foreground transition-all hover:opacity-90 disabled:opacity-40"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
