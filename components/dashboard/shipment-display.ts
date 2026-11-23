import { CheckCircle2, MapPinned, Package, Truck, type LucideIcon } from "lucide-react"
import type { Shipment, ShipmentAddress, ShipmentStatus } from "@/lib/shipments"

const STEP_LABELS: Record<ShipmentStatus, string> = {
  pending: "Ready to ship",
  "in-transit": "In transit",
  "ready-for-pickup": "Ready for pickup",
  arrived: "Delivered",
}

/** Timeline for one shipment; the pickup step only appears for locker / pickup point deliveries. */
export function shipmentSteps(s: Pick<Shipment, "status" | "receiverAddress">): { status: ShipmentStatus; label: string }[] {
  const viaPoint = Boolean(s.receiverAddress?.servicePoint) || s.status === "ready-for-pickup"
  const order: ShipmentStatus[] = viaPoint
    ? ["pending", "in-transit", "ready-for-pickup", "arrived"]
    : ["pending", "in-transit", "arrived"]
  return order.map((status) => ({ status, label: STEP_LABELS[status] }))
}

export const SHIPMENT_STATUS: Record<
  ShipmentStatus,
  { label: string; icon: LucideIcon; pill: string; iconBg: string }
> = {
  pending: {
    label: "Ready to ship",
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
  "ready-for-pickup": {
    label: "Ready for pickup",
    icon: MapPinned,
    pill: "border border-primary/20 bg-primary/10 text-primary",
    iconBg: "bg-primary/10 text-primary",
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
