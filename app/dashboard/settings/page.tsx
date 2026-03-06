"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  User,
  CreditCard,
  Shield,
  Bell,
  Key,
  IdCard,
  Camera,
  Check,
  Clock,
  Trash2,
  Plus,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type SettingsTab = "profile" | "kyc" | "payment" | "api" | "security" | "notifications"

const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "kyc", label: "KYC Verification", icon: IdCard },
  { id: "payment", label: "Payment Methods", icon: CreditCard },
  { id: "api", label: "API Keys", icon: Key },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Tabs Sidebar */}
        <div className="w-52 border-r border-border bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-3 border-l-3 px-4 py-3 text-left text-sm transition-all",
                activeTab === tab.id
                  ? "border-l-primary bg-primary/5 font-medium text-primary"
                  : "border-l-transparent text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-lg">
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "kyc" && <KYCTab />}
            {activeTab === "payment" && <PaymentTab />}
            {activeTab === "api" && <APITab />}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "notifications" && <NotificationsTab />}
          </div>
        </div>
      </div>
    </>
  )
}

function ProfileTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Personal Information
      </h3>

      {/* Avatar */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground">
            JD
          </div>
          <button className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Camera className="h-3 w-3" />
          </button>
        </div>
        <div>
          <p className="font-medium text-foreground">John Doe</p>
          <p className="text-xs text-muted-foreground">@johndoe</p>
          <p className="mt-1 text-[10px] text-primary">Member since 2023</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">First Name</label>
            <input type="text" defaultValue="John" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Last Name</label>
            <input type="text" defaultValue="Doe" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Email</label>
          <input type="email" defaultValue="john.doe@email.com" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Phone</label>
          <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Bio</label>
          <textarea rows={2} defaultValue="Trusted trader | Fast shipping" className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
          Save Changes
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/30 bg-card p-4">
        <h4 className="mb-2 text-xs font-medium text-destructive">Danger Zone</h4>
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-destructive transition-all hover:bg-destructive/10">
          <Trash2 className="h-3 w-3" />
          Delete Account
        </button>
      </div>
    </div>
  )
}

function KYCTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Identity Verification
      </h3>

      {/* Status */}
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success">
          <Check className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-success">Verified</p>
          <p className="text-xs text-muted-foreground">Your identity has been confirmed</p>
        </div>
        <Shield className="h-5 w-5 text-success" />
      </div>

      {/* Levels */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h4 className="text-xs font-medium text-foreground">Verification Levels</h4>
        {[
          { level: "Level 1 - Basic", desc: "Email & Phone verified", done: true },
          { level: "Level 2 - Identity", desc: "ID Document verified", done: true },
          { level: "Level 3 - Address", desc: "Proof of address required", done: false },
        ].map((l) => (
          <div key={l.level} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", l.done ? "bg-success/20 text-success" : "bg-warning/20 text-warning")}>
              {l.done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{l.level}</p>
              <p className="text-[10px] text-muted-foreground">{l.desc}</p>
            </div>
            <span className={cn("text-[10px]", l.done ? "text-success" : "text-primary")}>
              {l.done ? "Done" : "Verify"}
            </span>
          </div>
        ))}
      </div>

      {/* Limits */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-xs font-medium text-foreground">Your Limits</h4>
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-muted-foreground">Daily transactions</span>
          <span className="text-foreground">$10,000 / $50,000</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: "20%" }} />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Complete Level 3 to increase limits</p>
      </div>
    </div>
  )
}

function PaymentTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Payment Methods
        </h3>
        <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3 w-3" /> Add New
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10" />
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Visa</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">Default</span>
          </div>
          <p className="relative z-10 mb-3 font-mono text-lg tracking-widest text-foreground">
            {"•••• •••• •••• 4242"}
          </p>
          <div className="relative z-10 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">Card Holder</p>
              <p className="text-foreground">JOHN DOE</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Expires</p>
              <p className="text-foreground">12/25</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 opacity-70">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Mastercard</span>
          </div>
          <p className="mb-3 font-mono text-lg tracking-widest text-foreground">
            {"•••• •••• •••• 8888"}
          </p>
          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">Card Holder</p>
              <p className="text-foreground">JOHN DOE</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Expires</p>
              <p className="text-foreground">08/26</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bank */}
      <h4 className="text-xs font-medium text-muted-foreground">Bank Accounts</h4>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Chase Bank</p>
            <p className="text-[10px] text-muted-foreground">{"•••• 4521"}</p>
          </div>
        </div>
        <span className="text-[10px] text-success">Verified</span>
      </div>
    </div>
  )
}

function APITab() {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          API Keys
        </h3>
        <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3 w-3" /> Generate New
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Production Key</p>
            <p className="text-[10px] text-muted-foreground">Created Dec 15, 2023</p>
          </div>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">Active</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary p-2">
          <code className="flex-1 text-xs text-foreground">
            {showKey ? "pk_live_c8f2e9a7b3d4f5e6" : "pk_live_****...****"}
          </code>
          <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground">
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button className="text-muted-foreground hover:text-foreground">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Test Key</p>
            <p className="text-[10px] text-muted-foreground">Created Jan 2, 2024</p>
          </div>
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">Test</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary p-2">
          <code className="flex-1 text-xs text-foreground">{"pk_test_****...****"}</code>
          <button className="text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></button>
          <button className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  )
}

function SecurityTab() {
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Security Settings
      </h3>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        {[
          { label: "Two-Factor Authentication", desc: "Add an extra layer of security", enabled: true },
          { label: "Login Alerts", desc: "Get notified of new sign-ins", enabled: true },
          { label: "Withdrawal Confirmation", desc: "Require 2FA for withdrawals", enabled: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Toggle defaultEnabled={item.enabled} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-sm font-medium text-foreground">Change Password</h4>
        <div className="space-y-3">
          <input type="password" placeholder="Current password" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="password" placeholder="New password" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="password" placeholder="Confirm new password" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() => {
              const now = new Date()
              const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              setPasswordUpdatedAt(time)
            }}
          >
            Update Password
          </button>
          {passwordUpdatedAt && (
            <Alert className="mt-2 border-success/40 bg-success/5">
              <Check className="h-4 w-4 text-success" />
              <AlertTitle className="text-xs text-success">
                Password updated
              </AlertTitle>
              <AlertDescription className="text-[11px]">
                Your password was changed at {passwordUpdatedAt}. If this wasn&apos;t you, revoke other sessions.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-sm font-medium text-foreground">Active Sessions</h4>
        {[
          { device: "Chrome - MacOS", loc: "New York, US", current: true },
          { device: "Safari - iPhone", loc: "New York, US", current: false },
        ].map((s) => (
          <div key={s.device} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 mb-2">
            <div>
              <p className="text-xs font-medium text-foreground">{s.device}</p>
              <p className="text-[10px] text-muted-foreground">{s.loc}</p>
            </div>
            {s.current ? (
              <span className="text-[10px] text-success">Current</span>
            ) : (
              <button className="text-[10px] text-destructive">Revoke</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function NotificationsTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Notification Preferences
      </h3>

      {[
        {
          title: "Email Notifications",
          items: [
            { label: "Deal updates", desc: "Status changes on your deals", enabled: true },
            { label: "Payment received", desc: "When funds are released to you", enabled: true },
            { label: "Marketing", desc: "Product updates and promotions", enabled: false },
          ],
        },
        {
          title: "Push Notifications",
          items: [
            { label: "New messages", desc: "Chat messages from counterparties", enabled: true },
            { label: "Shipping updates", desc: "Tracking and delivery status", enabled: true },
            { label: "Security alerts", desc: "Login and withdrawal alerts", enabled: true },
          ],
        },
      ].map((group) => (
        <div key={group.title} className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-4 text-sm font-medium text-foreground">{group.title}</h4>
          <div className="space-y-4">
            {group.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Toggle defaultEnabled={item.enabled} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Toggle({ defaultEnabled }: { defaultEnabled: boolean }) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-secondary"
      )}
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
