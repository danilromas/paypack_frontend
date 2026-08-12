"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  CreditCard,
  Shield,
  Bell,
  Key,
  IdCard,
  Check,
  Clock,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type {
  ApiKeyDTO,
  NotificationPreferencesDTO,
  PaymentMethodDTO,
  SecuritySettingsDTO,
} from "@/lib/settings"

type SettingsTab = "kyc" | "payment" | "api" | "security" | "notifications"

const tabs: { id: SettingsTab; label: string; icon: typeof CreditCard }[] = [
  { id: "kyc", label: "KYC Verification", icon: IdCard },
  { id: "payment", label: "Payment Methods", icon: CreditCard },
  { id: "api", label: "API Keys", icon: Key },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
]

interface SettingsBundle {
  paymentMethods: PaymentMethodDTO[]
  apiKeys: ApiKeyDTO[]
  security: SecuritySettingsDTO
  notifications: NotificationPreferencesDTO
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("kyc")
  const [bundle, setBundle] = useState<SettingsBundle | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch("/api/settings", { cache: "no-store" })
    if (res.ok) setBundle(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Tabs: horizontal scroll on mobile, sidebar on desktop */}
        <div className="flex shrink-0 flex-row overflow-x-auto border-b border-border bg-card md:w-52 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-left text-sm transition-all md:w-full md:border-b-0 md:border-l-4",
                activeTab === tab.id
                  ? "border-primary bg-primary/5 font-medium text-primary md:border-l-primary"
                  : "border-transparent text-muted-foreground hover:bg-secondary/50 md:border-l-transparent"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
          <div className="mx-auto max-w-lg">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                {activeTab === "kyc" && <KYCTab />}
                {activeTab === "payment" && bundle && (
                  <PaymentTab methods={bundle.paymentMethods} onChange={load} />
                )}
                {activeTab === "api" && bundle && <APITab apiKeys={bundle.apiKeys} onChange={load} />}
                {activeTab === "security" && bundle && (
                  <SecurityTab security={bundle.security} onChange={load} />
                )}
                {activeTab === "notifications" && bundle && (
                  <NotificationsTab prefs={bundle.notifications} onChange={load} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function KYCTab() {
  const [status, setStatus] = useState<string | null>(null)
  const [riskLevel, setRiskLevel] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/kyc/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setStatus(data.status)
        setRiskLevel(data.riskLevel)
      })
  }, [])

  const isApproved = status === "approved"
  const isPending = status === "pending"
  const isRejected = status === "rejected"

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Identity Verification
      </h3>

      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          isApproved
            ? "border-success/30 bg-success/10"
            : isRejected
              ? "border-destructive/30 bg-destructive/10"
              : "border-warning/30 bg-warning/10",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isApproved
              ? "bg-success/20 text-success"
              : isRejected
                ? "bg-destructive/20 text-destructive"
                : "bg-warning/20 text-warning",
          )}
        >
          {isApproved ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p
            className={cn(
              "font-medium capitalize",
              isApproved ? "text-success" : isRejected ? "text-destructive" : "text-warning",
            )}
          >
            {status ?? "unverified"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isApproved
              ? "Your identity has been confirmed"
              : isPending
                ? "Your submission is awaiting admin review"
                : isRejected
                  ? "Your submission was not approved"
                  : "You haven't submitted verification yet"}
          </p>
        </div>
        <Shield className="h-5 w-5 text-muted-foreground" />
      </div>

      {riskLevel ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <span className="text-muted-foreground">Risk level: </span>
          <span className="font-medium capitalize text-foreground">{riskLevel}</span>
        </div>
      ) : null}

      <Link
        href="/dashboard/profile/"
        className="block w-full rounded-lg border border-primary/30 bg-primary/10 py-2 text-center text-sm font-medium text-primary transition-all hover:bg-primary/20"
      >
        Manage verification from Profile
      </Link>
    </div>
  )
}

function PaymentTab({ methods, onChange }: { methods: PaymentMethodDTO[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<"card" | "bank">("card")
  const [brand, setBrand] = useState("Visa")
  const [last4, setLast4] = useState("")
  const [holderName, setHolderName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [bankName, setBankName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function addMethod() {
    setSubmitting(true)
    setError(null)
    try {
      const body =
        kind === "card"
          ? { kind, brand, last4, holderName, expiry }
          : { kind, bankName, last4 }
      const res = await fetch("/api/settings/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Failed to add payment method")
        return
      }
      setAdding(false)
      setLast4("")
      setHolderName("")
      setExpiry("")
      setBankName("")
      onChange()
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/settings/payment-methods/${id}`, { method: "DELETE" })
    if (res.ok) onChange()
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/settings/payment-methods/${id}/default`, { method: "POST" })
    if (res.ok) onChange()
  }

  const cards = methods.filter((m) => m.kind === "card")
  const banks = methods.filter((m) => m.kind === "bank")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Payment Methods
        </h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> Add New
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Reference only — nothing here is a real payment provider connection.
      </p>

      {adding ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setKind("card")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium",
                kind === "card" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              Card
            </button>
            <button
              onClick={() => setKind("bank")}
              className={cn(
                "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium",
                kind === "bank" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              Bank account
            </button>
          </div>
          {kind === "card" ? (
            <>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Brand (Visa, Mastercard...)"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Card holder name"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                <input
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Last 4 digits"
                  className="w-1/2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="w-1/2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </>
          ) : (
            <>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank name"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Account number ending"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </>
          )}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button
            onClick={addMethod}
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {cards.length === 0 ? (
          <p className="text-xs text-muted-foreground">No cards added yet.</p>
        ) : (
          cards.map((m) => (
            <div key={m.id} className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10" />
              <div className="relative z-10 mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{m.brand}</span>
                <div className="flex items-center gap-2">
                  {m.isDefault ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Default</span>
                  ) : (
                    <button onClick={() => setDefault(m.id)} className="text-muted-foreground hover:text-primary">
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="relative z-10 mb-3 font-mono text-lg tracking-widest text-foreground">
                {"•••• •••• •••• "}
                {m.last4}
              </p>
              <div className="relative z-10 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Card Holder</p>
                  <p className="text-foreground">{m.holderName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Expires</p>
                  <p className="text-foreground">{m.expiry ?? "—"}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <h4 className="text-xs font-medium text-muted-foreground">Bank Accounts</h4>
      {banks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No bank accounts added yet.</p>
      ) : (
        banks.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{m.bankName}</p>
                <p className="text-[10px] text-muted-foreground">•••• {m.last4}</p>
              </div>
            </div>
            <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function APITab({ apiKeys, onChange }: { apiKeys: ApiKeyDTO[]; onChange: () => void }) {
  const [generating, setGenerating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<{ id: string; raw: string } | null>(null)
  const [visible, setVisible] = useState<string | null>(null)

  async function generate(environment: "live" | "test") {
    setGenerating(true)
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment, label: `${environment === "live" ? "Production" : "Test"} Key` }),
      })
      if (res.ok) {
        const data = await res.json()
        setRevealedKey({ id: data.id, raw: data.rawKey })
        onChange()
      }
    } finally {
      setGenerating(false)
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/settings/api-keys/${id}/revoke`, { method: "POST" })
    if (res.ok) onChange()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Keys</h3>
        <button
          onClick={() => generate("test")}
          disabled={generating}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Generate New
        </button>
      </div>

      {revealedKey ? (
        <Alert className="border-primary/40 bg-primary/5">
          <AlertTitle className="text-xs text-primary">Copy your key now</AlertTitle>
          <AlertDescription className="text-[11px]">
            This is shown once and can&apos;t be recovered later.
            <code className="mt-2 block break-all rounded bg-secondary p-2 text-xs text-foreground">
              {revealedKey.raw}
            </code>
          </AlertDescription>
        </Alert>
      ) : null}

      {apiKeys.length === 0 ? (
        <p className="text-xs text-muted-foreground">No API keys yet.</p>
      ) : (
        apiKeys.map((k) => (
          <div key={k.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{k.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  k.status === "revoked"
                    ? "bg-destructive/10 text-destructive"
                    : k.environment === "live"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning",
                )}
              >
                {k.status === "revoked" ? "Revoked" : k.environment === "live" ? "Active" : "Test"}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-2">
              <code className="flex-1 text-xs text-foreground">
                {visible === k.id ? k.keyPreview : `${k.keyPreview.slice(0, 8)}****...****`}
              </code>
              <button
                onClick={() => setVisible(visible === k.id ? null : k.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                {visible === k.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(k.keyPreview)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
              {k.status !== "revoked" ? (
                <button onClick={() => revoke(k.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function SecurityTab({ security, onChange }: { security: SecuritySettingsDTO; onChange: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  async function updateSecurityFlag(field: keyof SecuritySettingsDTO, value: boolean) {
    await fetch("/api/settings/security", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    onChange()
  }

  async function changePassword() {
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match")
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPasswordError(data.error ?? "Failed to change password")
        return
      }
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordUpdatedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Security Settings
      </h3>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Login Alerts</p>
            <p className="text-xs text-muted-foreground">Get an in-app notification of new sign-ins</p>
          </div>
          <Toggle
            defaultEnabled={security.loginAlertsEnabled}
            onChange={(v) => updateSecurityFlag("loginAlertsEnabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Withdrawal Confirmation</p>
            <p className="text-xs text-muted-foreground">
              Flag your account for extra confirmation before withdrawals (not yet enforced)
            </p>
          </div>
          <Toggle
            defaultEnabled={security.requireWithdrawalConfirmation}
            onChange={(v) => updateSecurityFlag("requireWithdrawalConfirmation", v)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-sm font-medium text-foreground">Change Password</h4>
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {passwordError ? <p className="text-xs text-destructive">{passwordError}</p> : null}
          <button
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={changingPassword || !currentPassword || !newPassword}
            onClick={changePassword}
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
          {passwordUpdatedAt && (
            <Alert className="mt-2 border-success/40 bg-success/5">
              <Check className="h-4 w-4 text-success" />
              <AlertTitle className="text-xs text-success">Password updated</AlertTitle>
              <AlertDescription className="text-[11px]">
                Your password was changed at {passwordUpdatedAt}. Other signed-in devices were signed out.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        Session management isn&apos;t available yet — use &quot;Log Out&quot; in the sidebar to end your current
        session.
      </div>
    </div>
  )
}

function NotificationsTab({
  prefs,
  onChange,
}: {
  prefs: NotificationPreferencesDTO
  onChange: () => void
}) {
  async function update(field: keyof NotificationPreferencesDTO, value: boolean) {
    await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    onChange()
  }

  const groups: {
    title: string
    items: { field: keyof NotificationPreferencesDTO; label: string; desc: string }[]
  }[] = [
    {
      title: "Email Notifications",
      items: [
        { field: "emailDealUpdates", label: "Deal updates", desc: "Status changes on your deals" },
        { field: "emailPaymentReceived", label: "Payment received", desc: "When funds are released to you" },
        { field: "emailMarketing", label: "Marketing", desc: "Product updates and promotions" },
      ],
    },
    {
      title: "Push Notifications",
      items: [
        { field: "pushNewMessages", label: "New messages", desc: "Chat messages from counterparties" },
        { field: "pushShippingUpdates", label: "Shipping updates", desc: "Tracking and delivery status" },
        { field: "pushSecurityAlerts", label: "Security alerts", desc: "Login and withdrawal alerts" },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Notification Preferences
      </h3>

      {groups.map((group) => (
        <div key={group.title} className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-4 text-sm font-medium text-foreground">{group.title}</h4>
          <div className="space-y-4">
            {group.items.map((item) => (
              <div key={item.field} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Toggle defaultEnabled={prefs[item.field]} onChange={(v) => update(item.field, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Toggle({
  defaultEnabled,
  onChange,
}: {
  defaultEnabled: boolean
  onChange?: (value: boolean) => void
}) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  return (
    <button
      onClick={() => {
        const next = !enabled
        setEnabled(next)
        onChange?.(next)
      }}
      className={cn("relative h-6 w-11 rounded-full transition-colors", enabled ? "bg-primary" : "bg-secondary")}
    >
      <div
        className={cn(
          "absolute top-1 h-4 w-4 rounded-full bg-card shadow transition-transform",
          enabled ? "left-6" : "left-1"
        )}
      />
    </button>
  )
}
