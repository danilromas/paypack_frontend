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

const progressSteps = ["Created", "Funds Locked", "Shipped", "In Transit", "Received"]

export function DealDetail() {
  const router = useRouter()
  const { selectedDealId, deals, updateDeal, refreshWallet, chatThreads, refreshChats } = useAppStore()
  const deal =
    deals.find((d) => d.id === selectedDealId) ?? deals[0]
  const [confirming, setConfirming] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const thread = deal ? chatThreads.find((t) => t.dealId === deal.id) ?? null : null

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

  async function handleConfirmReceipt() {
    if (!deal) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: deal.title,
          description: deal.description,
          imageUrl: deal.imageUrl ?? null,
          price: deal.price,
          shippingPrice: deal.shippingPrice,
          currency: deal.currency,
          status: "completed",
          role: deal.role,
          counterparty: deal.counterparty,
          counterpartyAvatar: deal.counterpartyAvatar ?? null,
          sourceUrl: deal.sourceUrl ?? null,
          sourcePlatform: deal.sourcePlatform ?? null,
          paymentMethod: deal.paymentMethod ?? null,
          paymentCryptoCoin: deal.paymentCryptoCoin ?? null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        updateDeal(updated)
        await refreshWallet()
      }
    } finally {
      setConfirming(false)
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

  const activeStep =
    deal.status === "pending"
      ? 0
      : deal.status === "escrow"
        ? 1
        : deal.status === "shipped"
          ? 2
          : deal.status === "in-transit"
            ? 3
            : 4

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
                {deal.status === "escrow"
                  ? "In Escrow"
                  : deal.status === "pending"
                    ? "Pending Payment"
                    : deal.status === "completed"
                      ? "Completed"
                      : "Active"}
              </span>
              <span>
                {deal.status === "escrow"
                  ? "Funds have locked in escrow."
                  : deal.status === "pending"
                    ? "Waiting for funds."
                    : "Deal completed."}
              </span>
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
                  Counterparty details
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Quick overview of who you are trading with.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-3 space-y-4 text-sm">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {deal.counterparty}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Verified PayPack Uno user
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Completed deals</span>
                    <span className="font-medium text-foreground">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Disputes</span>
                    <span className="font-medium text-success">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Trust score</span>
                    <span className="font-medium text-primary">4.9 / 5</span>
                  </div>
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

        {/* Action Buttons + deal details modal */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            disabled={confirming || ["completed", "cancelled", "disputed"].includes(deal.status)}
            onClick={handleConfirmReceipt}
            className="border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:border-success/30 hover:bg-success/10 hover:text-success disabled:opacity-50"
          >
            {confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Receipt"}
          </Button>
          <Button
            variant="outline"
            className="border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            Open Dispute
          </Button>
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
