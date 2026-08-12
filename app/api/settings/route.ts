import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys, notificationPreferences, paymentMethods, users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import type {
  ApiKeyDTO,
  NotificationPreferencesDTO,
  PaymentMethodDTO,
  SecuritySettingsDTO,
} from "@/lib/settings"

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferencesDTO = {
  emailDealUpdates: true,
  emailPaymentReceived: true,
  emailMarketing: false,
  pushNewMessages: true,
  pushShippingUpdates: true,
  pushSecurityAlerts: true,
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const [methods, keys, prefsRows, userRow] = await Promise.all([
      db.select().from(paymentMethods).where(eq(paymentMethods.userId, user.id)),
      db.select().from(apiKeys).where(eq(apiKeys.userId, user.id)),
      db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, user.id)).limit(1),
      db
        .select({
          loginAlertsEnabled: users.loginAlertsEnabled,
          requireWithdrawalConfirmation: users.requireWithdrawalConfirmation,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1),
    ])

    const paymentMethodsDto: PaymentMethodDTO[] = methods.map((m) => ({
      id: m.id,
      kind: m.kind as PaymentMethodDTO["kind"],
      brand: m.brand,
      last4: m.last4,
      holderName: m.holderName,
      expiry: m.expiry,
      bankName: m.bankName,
      isDefault: m.isDefault,
      createdAt: m.createdAt.toISOString(),
    }))

    const apiKeysDto: ApiKeyDTO[] = keys.map((k) => ({
      id: k.id,
      label: k.label,
      keyPreview: k.keyPreview,
      environment: k.environment as ApiKeyDTO["environment"],
      status: k.status as ApiKeyDTO["status"],
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
    }))

    const security: SecuritySettingsDTO = userRow[0] ?? {
      loginAlertsEnabled: true,
      requireWithdrawalConfirmation: false,
    }

    const notifications: NotificationPreferencesDTO = prefsRows[0] ?? DEFAULT_NOTIFICATION_PREFS

    return NextResponse.json({ paymentMethods: paymentMethodsDto, apiKeys: apiKeysDto, security, notifications })
  } catch (error) {
    console.error("GET /api/settings failed", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}
