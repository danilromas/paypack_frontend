import type { ExportReason, ShipmentAddress } from "@/lib/shipments"

/**
 * An unfinished shipment, kept in this browser so closing the wizard (or the tab) loses nothing.
 * Keyed by user, so people sharing a computer never see each other's addresses. The booking password
 * is never stored.
 */
export interface ShipmentDraft {
  v: 1
  savedAt: string
  step: number
  sender: ShipmentAddress & { name: string }
  receiver: ShipmentAddress & { name: string }
  weightKg: number | ""
  lengthCm: number | ""
  widthCm: number | ""
  heightCm: number | ""
  contents: string
  declaredValue: number | ""
  hsCode: string
  originCountry: string
  itemCount: number | ""
  exportReason: ExportReason
  senderVat: string
  selectedKey: string | null
  pickupDate: string
}

const keyFor = (userId: string) => `pp-shipment-draft:${userId}`
/** Older drafts are mostly stale prices and pickup dates — not worth resuming. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export function readShipmentDraft(userId: string | null | undefined): ShipmentDraft | null {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null
    const draft = JSON.parse(raw) as ShipmentDraft
    if (draft?.v !== 1 || !draft.sender || !draft.receiver) return null
    if (Date.now() - new Date(draft.savedAt).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(keyFor(userId))
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function writeShipmentDraft(userId: string | null | undefined, draft: ShipmentDraft) {
  if (!userId) return
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(draft))
  } catch {}
}

export function clearShipmentDraft(userId: string | null | undefined) {
  if (!userId) return
  try {
    localStorage.removeItem(keyFor(userId))
  } catch {}
}

/** Whether a draft holds anything worth resuming (a postcode, a name, a box…). */
export function isDraftWorthKeeping(d: Omit<ShipmentDraft, "v" | "savedAt">): boolean {
  return Boolean(
    d.sender.zip.trim() ||
      d.receiver.zip.trim() ||
      d.sender.name.trim() ||
      d.receiver.name.trim() ||
      d.weightKg !== "" ||
      d.contents.trim(),
  )
}

/** "Berlin → Milan" style label for the resume card. */
export function draftRouteLabel(d: ShipmentDraft): string {
  const side = (p: ShipmentDraft["sender"]) => p.city.trim() || [p.country, p.zip.trim()].filter(Boolean).join(" ") || "…"
  return `${side(d.sender)} → ${side(d.receiver)}`
}
