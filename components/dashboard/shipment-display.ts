import { CheckCircle2, Package, Truck, type LucideIcon } from "lucide-react"
import type { Shipment, ShipmentAddress, ShipmentStatus } from "@/lib/shipments"

export const SHIPMENT_STEPS: { status: ShipmentStatus; label: string }[] = [
  { status: "pending", label: "Booked" },
  { status: "in-transit", label: "In transit" },
  { status: "arrived", label: "Delivered" },
]

export function shipmentStepIndex(status: ShipmentStatus) {
  return SHIPMENT_STEPS.findIndex((s) => s.status === status)
}

export const SHIPMENT_STATUS: Record<
  ShipmentStatus,
  { label: string; icon: LucideIcon; pill: string; iconBg: string }
> = {
  pending: {
    label: "Booked",
    icon: Package,
    pill: "border border-warning/20 bg-warning/20 text-warning-foreground",
    iconBg: "bg-warning/15 text-warning-foreground",
  },
  "in-transit": {
    label: "In transit",
    icon: Truck,
    pill: "border border-ship/20 bg-ship/10 text-ship",
    iconBg: "bg-ship/10 text-ship",
  },
  arrived: {
    label: "Delivered",
    icon: CheckCircle2,
    pill: "border border-success/20 bg-success/10 text-success",
    iconBg: "bg-success/10 text-success",
  },
}

/** Older shipments only have a free-text location ("Tallinn, Estonia") — take its first part as the city. */
function cityOf(address: ShipmentAddress | null, location: string) {
  if (address?.city) return address.city
  return location.split(",")[0]?.trim() || location
}

export function shipmentRoute(s: Shipment) {
  return { from: cityOf(s.senderAddress, s.senderLocation), to: cityOf(s.receiverAddress, s.receiverLocation) }
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount)
}

/** Pickup is a calendar day (YYYY-MM-DD) — format it without letting the timezone shift it. */
export function formatDay(day: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  )
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}
