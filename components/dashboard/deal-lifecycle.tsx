"use client"

import { useEffect, useState } from "react"
import {
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Gavel,
  Handshake,
  History,
  MapPin,
  PackageCheck,
  Pencil,
  PlusCircle,
  Star,
  Truck,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import { cn, formatDealDateTime, formatDealRelativeTime } from "@/lib/utils"
import { DESTINATION_COUNTRIES } from "@/lib/shipments"
import {
  BUYER_PROTECTION_DAYS,
  releaseAvailableAt,
  trackingUrlFor,
  type DealEventDTO,
  type DealEventType,
  type DeliveryAddress,
} from "@/lib/deals"
import type { Deal } from "@/types"

export const EMPTY_DELIVERY: DeliveryAddress = {
  name: "",
  phone: "",
  street: "",
  city: "",
  postcode: "",
  country: "",
  note: "",
}

const lastAddressKey = (userId: string) => `pp-last-delivery:${userId}`

/** The buyer's last delivery address, remembered in this browser so the next payment is one click. */
export function readLastDelivery(userId: string | null | undefined): DeliveryAddress | null {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(lastAddressKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DeliveryAddress>
    return parsed && typeof parsed.street === "string" ? { ...EMPTY_DELIVERY, ...parsed } : null
  } catch {
    return null
  }
}

export function writeLastDelivery(userId: string | null | undefined, address: DeliveryAddress) {
  if (!userId) return
  try {
    localStorage.setItem(lastAddressKey(userId), JSON.stringify(address))
  } catch {}
}

export function countryName(code: string): string {
  return DESTINATION_COUNTRIES.find((c) => c.code === code)?.name ?? code
}

export function formatDeliveryAddress(a: Deal["delivery"]): string {
  if (!a) return ""
  return [a.name, a.street, `${a.postcode} ${a.city}`.trim(), countryName(a.country), a.phone].filter(Boolean).join("\n")
}

const inputClass =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"

/** Recipient, street, city, postcode, country and phone — what the seller needs to post the item. */
export function DeliveryAddressForm({
  value,
  onChange,
}: {
  value: DeliveryAddress
  onChange: (next: DeliveryAddress) => void
}) {
  const set = (key: keyof DeliveryAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value })
  return (
    <div className="grid grid-cols-2 gap-2">
      <input className={cn(inputClass, "col-span-2")} placeholder="Recipient name" value={value.name} onChange={set("name")} autoComplete="name" />
      <input
        className={cn(inputClass, "col-span-2")}
        placeholder="Street and house number"
        value={value.street}
        onChange={set("street")}
        autoComplete="street-address"
      />
      <input className={inputClass} placeholder="Postcode" value={value.postcode} onChange={set("postcode")} autoComplete="postal-code" />
      <input className={inputClass} placeholder="City" value={value.city} onChange={set("city")} autoComplete="address-level2" />
      <select className={inputClass} value={value.country} onChange={set("country")} aria-label="Country">
        <option value="">Country…</option>
        {DESTINATION_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <input className={inputClass} placeholder="Phone (for the courier)" value={value.phone} onChange={set("phone")} autoComplete="tel" />
      <input
        className={cn(inputClass, "col-span-2")}
        placeholder="Note for the seller (optional) — e.g. leave with the concierge"
        value={value.note}
        onChange={set("note")}
      />
    </div>
  )
}

/** Where the item goes. The seller copies it for the label; the buyer can fix it until it ships. */
export function DeliveryCard({ deal, onEdit }: { deal: Deal; onEdit?: () => void }) {
  const [copied, setCopied] = useState(false)
  const a = deal.delivery
  if (!a) return null
  const text = formatDeliveryAddress(a)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="pp-animate-slide-in mb-6 rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          {deal.myRole === "seller" ? "Ship to" : "Delivery address"}
        </div>
        <div className="flex items-center gap-1">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{text}</p>
      {a.note ? <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">“{a.note}”</p> : null}
    </div>
  )
}

/** Carrier, tracking number (linked to the carrier's page) and the buyer-protection countdown. */
export function ShippingStatusCard({ deal }: { deal: Deal }) {
  if (!deal.shippedAt && !deal.carrier && !deal.trackingNumber) return null
  const url = trackingUrlFor(deal.carrier, deal.trackingNumber)
  const releaseAt = releaseAvailableAt(deal.shippedAt)
  const daysLeft = releaseAt ? Math.ceil((releaseAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null

  return (
    <div className="pp-animate-slide-in mb-6 rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {deal.deliveredAt ? <PackageCheck className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {deal.deliveredAt ? "Delivered" : deal.status === "shipped" ? "On the way" : "Shipping"}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {[deal.carrier, deal.trackingNumber].filter(Boolean).join(" · ") || "No tracking number"}
            {deal.shippedAt ? ` · sent ${formatDealRelativeTime(deal.shippedAt)}` : ""}
          </p>
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            Track <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
      {deal.status === "shipped" && daysLeft !== null ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {daysLeft > 0
              ? deal.myRole === "buyer"
                ? `Buyer protection: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to confirm receipt or open a dispute. After that the seller can release the payment.`
                : `Buyer protection: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left. If the buyer doesn't confirm or dispute by then, you can release the payment yourself.`
              : `The ${BUYER_PROTECTION_DAYS}-day buyer protection has ended.`}
          </span>
        </div>
      ) : null}
    </div>
  )
}

const EVENT_META: Record<DealEventType, { icon: LucideIcon; label: string; tone: string }> = {
  created: { icon: PlusCircle, label: "Deal created", tone: "text-primary bg-primary/10" },
  edited: { icon: Pencil, label: "Terms updated", tone: "text-muted-foreground bg-secondary" },
  joined: { icon: UserPlus, label: "Counterparty joined", tone: "text-primary bg-primary/10" },
  paid: { icon: CreditCard, label: "Paid into escrow", tone: "text-success bg-success/10" },
  address_updated: { icon: MapPin, label: "Address changed", tone: "text-muted-foreground bg-secondary" },
  shipped: { icon: Truck, label: "Shipped", tone: "text-ship bg-ship/10" },
  delivered: { icon: PackageCheck, label: "Delivered", tone: "text-ship bg-ship/10" },
  completed: { icon: CheckCircle2, label: "Completed", tone: "text-success bg-success/10" },
  auto_released: { icon: Handshake, label: "Payment released", tone: "text-success bg-success/10" },
  cancelled: { icon: Ban, label: "Cancelled", tone: "text-destructive bg-destructive/10" },
  disputed: { icon: Gavel, label: "Dispute opened", tone: "text-destructive bg-destructive/10" },
  dispute_resolved: { icon: Gavel, label: "Dispute resolved", tone: "text-primary bg-primary/10" },
  rated: { icon: Star, label: "Rated", tone: "text-warning bg-warning/10" },
}

/** Everything that happened on the deal, newest first. Reloads whenever the deal changes. */
export function DealTimeline({ deal, viewerId }: { deal: Deal; viewerId: string | null }) {
  const [events, setEvents] = useState<DealEventDTO[] | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/deals/${deal.id}/events/`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<DealEventDTO[]>) : []))
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
    return () => {
      cancelled = true
    }
  }, [deal.id, deal.updatedAt, deal.hasRated])

  if (!events || events.length === 0) return null
  const ordered = [...events].reverse()
  const visible = expanded ? ordered : ordered.slice(0, 4)

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <History className="h-4 w-4 text-primary" />
        Deal history
      </div>
      <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
        {visible.map((e) => {
          const meta = EVENT_META[e.type] ?? EVENT_META.edited
          const who = e.actorUserId === null ? "PayPack" : e.actorUserId === viewerId ? "You" : (e.actorName ?? "Counterparty")
          return (
            <li key={e.id} className="relative flex gap-3">
              <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.tone)}>
                <meta.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="text-sm font-medium text-foreground">{meta.label}</div>
                <div className="text-xs text-muted-foreground">
                  {e.message ? `${e.message} · ` : ""}
                  {who} · <span title={formatDealDateTime(e.createdAt)}>{formatDealRelativeTime(e.createdAt)}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      {ordered.length > 4 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : `Show all ${ordered.length} events`}
        </button>
      ) : null}
    </div>
  )
}
