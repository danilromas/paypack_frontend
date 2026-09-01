"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, MessageCircle, User } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { cn, formatDealDateTime, formatDealRelativeTime } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

const progressSteps = ["Created", "Escrow", "Shipped", "Completed"]

const progressStepIndex: Record<string, number> = {
  pending: 0,
  escrow: 1,
  shipped: 2,
  completed: 3,
  disputed: 2,
  cancelled: 0,
}

export function DealDetail() {
  const router = useRouter()
  const { selectedDealId, deals, updateDeal, refreshWallet, chatThreads, refreshChats } = useAppStore()
  const deal = deals.find((d) => d.id === selectedDealId) ?? deals[0]
  const [acting, setActing] = useState<"accept" | "ship" | "confirm-receipt" | "cancel" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputing, setDisputing] = useState(false)
  const [disputeError, setDisputeError] = useState<string | null>(null)

  const thread = deal ? chatThreads.find((t) => t.dealId === deal.id) ?? null : null

  async function runAction(action: "accept" | "ship" | "confirm-receipt" | "cancel") {
    if (!deal) return
    setActing(action)
    setActionError(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/${action}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error ?? "Something went wrong")
        return
      }
      updateDeal(data)
      await refreshWallet()
    } finally {
      setActing(null)
    }
  }

  async function handleInvite() {
    if (!deal || !inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInviteError(data.error ?? "Failed to send invite")
        return
      }
      await refreshChats()
      router.push(`/dashboard/chats/?thread=${data.threadId}`)
    } finally {
      setInviting(false)
    }
  }

  async function handleOpenDispute() {
    if (!deal || !disputeReason.trim()) return
    setDisputing(true)
    setDisputeError(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDisputeError(data.error ?? "Failed to open dispute")
        return
      }
      updateDeal({ ...deal, status: "disputed" })
      setDisputeOpen(false)
      setDisputeReason("")
    } finally {
      setDisputing(false)
    }
  }

  if (!deal) {
    return (
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          Deal Detail
        </h2>
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No deals yet. Create one from the dashboard.
        </p>
      </div>
    )
  }

  const activeStep = progressStepIndex[deal.status] ?? 0
  const counterpartyLabel = deal.counterpartyName ?? deal.counterparty

  // One clear primary action at a time — whoever's turn it is to move the deal forward.
  let primaryAction: { label: string; action: "accept" | "ship" | "confirm-receipt"; hint: string } | null = null
  if (deal.status === "pending" && deal.myRole === "buyer") {
    primaryAction = {
      label: `Accept & Pay ${deal.price + deal.shippingPrice} ${deal.currency} into Escrow`,
      action: "accept",
      hint: "This charges your PayPack wallet balance immediately.",
    }
  } else if (deal.status === "escrow" && deal.myRole === "seller") {
    primaryAction = { label: "Mark as Shipped", action: "ship", hint: "Let the buyer know their item is on its way." }
  } else if (deal.status === "shipped" && deal.myRole === "buyer") {
    primaryAction = {
      label: "Confirm Receipt",
      action: "confirm-receipt",
      hint: "This releases the funds to the seller — only confirm once you've received the item.",
    }
  }

  const waitingMessage =
    deal.status === "pending" && deal.myRole === "seller"
      ? deal.counterpartyJoined
        ? "Waiting for the buyer to accept and pay."
        : `Waiting for ${counterpartyLabel} to join PayPack.`
      : deal.status === "escrow" && deal.myRole === "buyer"
        ? "Waiting for the seller to ship."
        : deal.status === "shipped" && deal.myRole === "seller"
          ? "Waiting for the buyer to confirm receipt."
          : null

  const canDispute = deal.status === "escrow" || deal.status === "shipped"
  const canCancel = deal.status === "pending" || deal.status === "escrow"

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <FileText className="h-5 w-5 text-primary" />
        Deal Detail
      </h2>

      <div className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-0">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-lg font-bold text-primary">
              {deal.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                #{deal.id.slice(0, 8)}
              </Badge>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                {deal.status}
              </span>
              <span className="capitalize">You're the {deal.myRole}</span>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80">
                <User className="h-5 w-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base">
                  Counterparty
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Who you're trading with on this deal.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-3 space-y-2 text-sm">
                <div className="text-sm font-semibold text-foreground">
                  {counterpartyLabel}
                </div>
                <div className="text-xs text-muted-foreground">
                  {deal.counterpartyJoined ? "Joined PayPack" : "Invited — hasn't joined yet"}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {deal.imageUrl ? (
          <div className="mb-6 overflow-hidden rounded-xl border border-border bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={deal.imageUrl}
              alt={deal.title}
              className="h-44 w-full object-cover"
            />
          </div>
        ) : null}

        {/* Progress Steps */}
        <div className="mb-6 flex justify-between gap-1 md:mb-8">
          {progressSteps.map((step, i) => (
            <div key={step} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2",
                      i <= activeStep ? "bg-success" : "bg-border"
                    )}
                    style={{ width: "100%", right: "50%" }}
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 h-4 w-4 rounded-full border-4",
                    i < activeStep
                      ? "border-success/30 bg-success"
                      : i === activeStep
                        ? "border-warning/30 bg-warning"
                        : "border-muted bg-muted-foreground/30"
                  )}
                />
              </div>
              <span className="text-center text-[9px] text-muted-foreground sm:text-[10px]">
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Chat */}
        {thread ? (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {thread.otherName ?? thread.otherInvitedEmail ?? "Invited"}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {thread.lastMessage ?? (thread.otherJoined ? "No messages yet" : "Waiting to join PayPack")}
              </p>
              {thread.lastMessageAt ? (
                <p className="text-[10px] text-muted-foreground">{formatDealRelativeTime(thread.lastMessageAt)}</p>
              ) : null}
            </div>
            <Button
              size="sm"
              className="shrink-0 rounded-xl bg-primary"
              onClick={() => router.push(`/dashboard/chats/?thread=${thread.threadId}`)}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Open Chat
              {thread.unreadCount > 0 ? (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {thread.unreadCount}
                </span>
              ) : null}
            </Button>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-2 text-sm font-semibold text-foreground">Invite counterparty to chat</div>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="counterparty@email.com"
                className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button size="sm" className="rounded-xl bg-primary" disabled={inviting || !inviteEmail.trim()} onClick={handleInvite}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
              </Button>
            </div>
            {inviteError ? <p className="mt-2 text-xs text-destructive">{inviteError}</p> : null}
          </div>
        )}

        {/* Primary action — one clear next step, or a status message when it's the other side's turn */}
        {primaryAction ? (
          <div className="mb-3 space-y-2">
            <Button
              className="w-full rounded-xl bg-primary py-5 text-sm font-semibold"
              disabled={acting !== null}
              onClick={() => runAction(primaryAction!.action)}
            >
              {acting === primaryAction.action ? <Loader2 className="h-4 w-4 animate-spin" /> : primaryAction.label}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{primaryAction.hint}</p>
          </div>
        ) : waitingMessage ? (
          <div className="mb-3 rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
            {waitingMessage}
          </div>
        ) : null}
        {actionError ? <p className="mb-3 text-center text-xs text-destructive">{actionError}</p> : null}

        {/* Secondary actions + deal details modal */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            disabled={!canCancel || acting !== null}
            onClick={() => runAction("cancel")}
            className="border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            {acting === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Deal"}
          </Button>
          <Dialog
            open={disputeOpen}
            onOpenChange={(o) => {
              setDisputeOpen(o)
              if (!o) setDisputeError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!canDispute}
                className="border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                Open Dispute
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base">Open a dispute</DialogTitle>
                <DialogDescription className="text-xs">
                  Explain what went wrong with &quot;{deal.title}&quot;. An admin will review it.
                </DialogDescription>
              </DialogHeader>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="e.g. Item not received, item not as described..."
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {disputeError ? <p className="text-xs text-destructive">{disputeError}</p> : null}
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  disabled={disputing || !disputeReason.trim()}
                  onClick={handleOpenDispute}
                >
                  {disputing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open dispute"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                Deal details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader className="space-y-1">
                <DialogTitle className="flex items-center justify-between text-base">
                  <span>Deal #{deal.id}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {deal.currency} escrow
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Full breakdown of this escrow transaction.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4 text-sm">
                {deal.imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Item
                  </div>
                  <div className="font-semibold text-foreground">
                    {deal.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {deal.description}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 rounded-lg bg-secondary px-3 py-2">
                    <div className="text-muted-foreground">Price</div>
                    <div className="text-sm font-semibold text-foreground">
                      {deal.price} {deal.currency}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg bg-secondary px-3 py-2">
                    <div className="text-muted-foreground">Shipping</div>
                    <div className="text-sm font-semibold text-foreground">
                      {deal.shippingPrice} {deal.currency}
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    Created:{" "}
                    <span className="font-medium text-foreground">
                      {formatDealDateTime(deal.createdAt)}
                    </span>
                  </div>
                  <div>
                    Updated:{" "}
                    <span className="font-medium text-foreground">
                      {formatDealDateTime(deal.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
