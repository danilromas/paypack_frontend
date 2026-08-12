import "server-only"
import { randomBytes, createHash } from "node:crypto"

export type PaymentKind = "card" | "bank"
export type ApiKeyEnvironment = "live" | "test"

export interface PaymentMethodDTO {
  id: string
  kind: PaymentKind
  brand: string | null
  last4: string | null
  holderName: string | null
  expiry: string | null
  bankName: string | null
  isDefault: boolean
  createdAt: string
}

export interface ApiKeyDTO {
  id: string
  label: string
  keyPreview: string
  environment: ApiKeyEnvironment
  status: "active" | "revoked"
  createdAt: string
  revokedAt: string | null
}

export interface NotificationPreferencesDTO {
  emailDealUpdates: boolean
  emailPaymentReceived: boolean
  emailMarketing: boolean
  pushNewMessages: boolean
  pushShippingUpdates: boolean
  pushSecurityAlerts: boolean
}

export interface SecuritySettingsDTO {
  loginAlertsEnabled: boolean
  requireWithdrawalConfirmation: boolean
}

/** Returns { raw, hash, preview } — only raw is shown to the user, once, at creation time. */
export function generateApiKey(environment: ApiKeyEnvironment) {
  const prefix = environment === "live" ? "pk_live_" : "pk_test_"
  const token = randomBytes(24).toString("hex")
  const raw = `${prefix}${token}`
  const hash = createHash("sha256").update(raw).digest("hex")
  const preview = `${prefix}${"*".repeat(8)}${token.slice(-4)}`
  return { raw, hash, preview }
}

export function validatePaymentMethod(body: Record<string, unknown>): string | null {
  const kind = body.kind
  if (kind !== "card" && kind !== "bank") return "Invalid payment method kind"
  if (kind === "card") {
    if (typeof body.last4 !== "string" || !/^\d{4}$/.test(body.last4)) {
      return "Last 4 digits must be exactly 4 numbers"
    }
    if (typeof body.brand !== "string" || !body.brand.trim()) return "Card brand is required"
  } else {
    if (typeof body.bankName !== "string" || !body.bankName.trim()) return "Bank name is required"
    if (typeof body.last4 !== "string" || !/^\d{2,4}$/.test(body.last4)) {
      return "Account number ending must be 2-4 digits"
    }
  }
  return null
}
