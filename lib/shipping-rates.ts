export type ServiceTier = "economy" | "standard" | "express"

export interface ServiceTierInfo {
  id: ServiceTier
  label: string
  eta: string
  baseFee: number
  perKgRate: number
}

/**
 * Deterministic internal estimate — not a real carrier's rate. No external API is called; this is a
 * PacklinkPro-style "compare a few options" moment built entirely on our own numbers.
 */
export const SERVICE_TIERS: ServiceTierInfo[] = [
  { id: "economy", label: "Economy", eta: "5–7 business days", baseFee: 3, perKgRate: 1.2 },
  { id: "standard", label: "Standard", eta: "2–3 business days", baseFee: 5, perKgRate: 1.8 },
  { id: "express", label: "Express", eta: "Next business day", baseFee: 9, perKgRate: 3.0 },
]

export function getServiceTier(id: string): ServiceTierInfo | undefined {
  return SERVICE_TIERS.find((t) => t.id === id)
}

export interface PackageDimensions {
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

/** Standard air-courier volumetric divisor — a package that's large but light still costs more to ship. */
const VOLUMETRIC_DIVISOR = 5000

export function estimateShippingCost(pkg: PackageDimensions, tier: ServiceTierInfo): number {
  const volumetricWeight = (pkg.lengthCm * pkg.widthCm * pkg.heightCm) / VOLUMETRIC_DIVISOR
  const billableWeight = Math.max(pkg.weightKg, volumetricWeight)
  const cost = tier.baseFee + billableWeight * tier.perKgRate
  return Math.round(cost * 100) / 100
}

export function validatePackageDimensions(pkg: Partial<PackageDimensions>): string | null {
  const fields: (keyof PackageDimensions)[] = ["weightKg", "lengthCm", "widthCm", "heightCm"]
  for (const field of fields) {
    const value = pkg[field]
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
      return `Invalid ${field}`
    }
  }
  return null
}

const TRACKING_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous 0/O/1/I

export function generateTrackingNumber(): string {
  let suffix = ""
  for (let i = 0; i < 9; i++) {
    suffix += TRACKING_CHARS[Math.floor(Math.random() * TRACKING_CHARS.length)]
  }
  return `PP${suffix}`
}
