"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  HelpCircle,
  MessageCircle,
  FileText,
  AlertTriangle,
  ChevronDown,
  Search,
  Clock,
  CheckCircle,
  Loader2,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type DisputeStatus = "open" | "needs-info" | "resolved"

interface DisputeEvent {
  id: string
  actorName: string | null
  text: string
  createdAt: string
}

interface Dispute {
  id: string
  dealId: string
  dealTitle: string
  openedByUserId: string
  openedByName: string
  status: DisputeStatus
  reason: string
  amount: number
  currency: string
  createdAt: string
  resolvedAt: string | null
  events: DisputeEvent[]
  myRole?: "buyer" | "seller"
  counterpartyName?: string | null
}

const infoTiles = [
  { icon: HelpCircle, label: "General Help", desc: "Account, billing, and general questions", color: "bg-primary/10 text-primary" },
  { icon: FileText, label: "Documentation", desc: "Guides, tutorials, and API docs", color: "bg-success/10 text-success" },
  { icon: MessageCircle, label: "Live Chat", desc: "Talk to our support team now", color: "bg-warning/10 text-warning" },
]

const faq = [
  {
    q: "How do I open a dispute?",
    a: "Open the deal from your dashboard while it's in escrow or already shipped, and use \"Open Dispute\" on that deal's card. Disputes can't be opened before the counterparty has accepted, or after the deal is completed or cancelled.",
  },
  {
    q: "How long does it take to receive my refund?",
    a: "If a deal is cancelled while still pending or in escrow, the buyer's held funds are refunded to their wallet immediately — no waiting period.",
  },
  {
    q: "How do I verify my identity (KYC)?",
    a: "Go to Settings → KYC Verification and submit your documents there. An admin reviews submissions manually.",
  },
  {
    q: "What are the transaction fees?",
    a: "PayPack does not charge any transaction fees right now — the full deal amount moves between buyer and seller.",
  },
]

function statusMeta(status: DisputeStatus) {
  switch (status) {
    case "resolved":
      return { label: "Resolved", icon: CheckCircle, className: "bg-success/10 text-success" }
    case "needs-info":
      return { label: "Needs your reply", icon: AlertTriangle, className: "bg-warning/10 text-warning" }
    default:
      return { label: "Open", icon: Clock, className: "bg-primary/10 text-primary" }
  }
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(dateString),
  )
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<"help" | "tickets">("help")
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyError, setReplyError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const loadDisputes = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/disputes/", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load disputes")
      const data = (await response.json()) as Dispute[]
      setDisputes(data)
      setSelected((prev) => (prev ? data.find((d) => d.id === prev.id) ?? null : null))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDisputes()
  }, [])

  const openCount = useMemo(
    () => disputes.filter((d) => d.status === "open" || d.status === "needs-info").length,
    [disputes],
  )

  const sendReply = async () => {
    if (!selected) return
    setReplyError(null)
    setSending(true)
    try {
      const response = await fetch(`/api/disputes/${selected.id}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to send message")
      setReplyText("")
      await loadDisputes()
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">Support Center</h1>
          <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
            {"How can we help you today?"}
          </p>

          {/* Search */}
          <div className="relative mb-6 sm:mb-8">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for help articles or FAQ..."
              className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Tabs */}
          <div className="mb-8 flex gap-2 rounded-xl bg-secondary/50 p-1">
            {(["help", "tickets"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                  activeTab === tab ? "bg-card text-foreground shadow" : "text-muted-foreground",
                )}
              >
                {tab === "help" ? "Help Center" : `My Disputes${openCount > 0 ? ` (${openCount})` : ""}`}
              </button>
            ))}
          </div>

          {activeTab === "help" && (
            <>
              {/* Categories */}
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  onClick={() => setActiveTab("tickets")}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground">Disputes</h3>
                    <p className="text-sm text-muted-foreground">Open or manage a transaction dispute</p>
                  </div>
                </button>
                {infoTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left"
                  >
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", tile.color)}>
                      <tile.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-card-foreground">{tile.label}</h3>
                      <p className="text-sm text-muted-foreground">{tile.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ */}
              <h2 className="mb-4 text-lg font-semibold text-foreground">Popular Articles</h2>
              <div className="space-y-2">
                {faq.map((item, i) => (
                  <div key={item.q} className="rounded-xl border border-border bg-card">
                    <button
                      onClick={() => setOpenFaq((prev) => (prev === i ? null : i))}
                      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground"
                    >
                      {item.q}
                      <ChevronDown
                        className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openFaq === i && "rotate-180")}
                      />
                    </button>
                    {openFaq === i && (
                      <p className="border-t border-border px-5 py-4 text-sm text-muted-foreground">{item.a}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "tickets" && (
            <div className="space-y-3">
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading disputes...
                </div>
              ) : disputes.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  You have no disputes. Disputes open from an active deal — go to your dashboard and use
                  &quot;Open Dispute&quot; on a deal in escrow or shipped.
                </div>
              ) : (
                disputes.map((d) => {
                  const meta = statusMeta(d.status)
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelected(d)
                        setReplyError(null)
                        setReplyText("")
                      }}
                      className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", meta.className)}>
                          <meta.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{d.dealTitle}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-3">
                            <span>
                              {d.amount.toFixed(2)} {d.currency}
                            </span>
                            <span>{formatDate(d.createdAt)}</span>
                            {d.myRole && <span className="capitalize">Your role: {d.myRole}</span>}
                            <span>Opened by {d.openedByName}</span>
                          </div>
                        </div>
                      </div>
                      <span className={cn("shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium sm:self-center", meta.className)}>
                        {meta.label}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg" showCloseButton>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2 text-base">
                  <span>{selected.dealTitle}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {selected.amount.toFixed(2)} {selected.currency}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Opened by {selected.openedByName} on {formatDate(selected.createdAt)}
                  {selected.counterpartyName ? ` · counterparty: ${selected.counterpartyName}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
                {selected.events.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border bg-secondary/50 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{e.actorName ?? "Admin"}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                    </div>
                    <p className="text-muted-foreground">{e.text}</p>
                  </div>
                ))}
              </div>

              {selected.status === "resolved" ? (
                <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                  This dispute is resolved.
                </p>
              ) : (
                <div className="space-y-2 border-t border-border pt-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      selected.status === "needs-info"
                        ? "Provide the information the admin asked for..."
                        : "Add more details for the admin..."
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {replyError && <p className="text-xs text-destructive">{replyError}</p>}
                  <div className="flex justify-end">
                    <button
                      onClick={sendReply}
                      disabled={sending || !replyText.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                </div>
              )}

              <Link href="/dashboard/" className="text-center text-xs text-primary hover:underline">
                View the deal
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
