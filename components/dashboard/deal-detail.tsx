"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, ChevronRight, Coins, Copy, FileText, Loader2, MessageCircle, Package, PackageCheck, Star, User, Wallet } from "lucide-react"
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
import { RatingStars } from "@/components/dashboard/rating-stars"
import {
  PAYMENT_METHODS,
  CRYPTO_COINS,
  buildDemoCryptoAddress,
  type PaymentMethod,
  type CryptoCoin,
} from "@/lib/payments"
import { DEAL_CARRIERS, releaseAvailableAt, validateDeliveryAddress, type DeliveryAddress } from "@/lib/deals"
import { writeShipmentDraft, readShipmentDraft } from "@/components/dashboard/shipment-draft"
import {
  DealTimeline,
  DeliveryAddressForm,
  DeliveryCard,
  EMPTY_DELIVERY,
  ShippingStatusCard,
  readLastDelivery,
  writeLastDelivery,
} from "@/components/dashboard/deal-lifecycle"

const progressSteps = ["Created", "Paid", "Shipped", "Delivered", "Completed"]

function progressIndex(deal: { status: string; deliveredAt?: string; shippedAt?: string; paidAt?: string }): number {
  switch (deal.status) {
    case "completed":
      return 4
    case "shipped":
      return deal.deliveredAt ? 3 : 2
    case "escrow":
      return 1
    case "disputed":
      return deal.deliveredAt ? 3 : deal.shippedAt ? 2 : 1
    default:
      return 0
  }
}

type DealAction = "accept" | "ship" | "confirm-receipt" | "cancel" | "delivered" | "release"

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  escrow: "bg-primary/15 text-primary",
  shipped: "bg-ship/15 text-ship",
  completed: "bg-success/15 text-success",
  disputed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
}

interface ConfettiPiece {
  left: number
  color: string
  delay: number
  size: number
}

const CONFETTI_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#eab308", "#ec4899", "#06b6d4"]

function buildConfetti(count = 14): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.4,
    size: 6 + Math.random() * 6,
  }))
}

export function DealDetail({ showHeading = true }: { showHeading?: boolean } = {}) {
  const router = useRouter()
  const { selectedDealId, deals, updateDeal, refreshWallet, chatThreads, wallet } = useAppStore()
  const viewerId = useAppStore((s) => s.user?.id ?? null)
  const viewerName = useAppStore((s) => s.user?.name ?? "")
  const deal = deals.find((d) => d.id === selectedDealId) ?? deals[0]
  const [acting, setActing] = useState<DealAction | null>(null)
  const [delivery, setDelivery] = useState<DeliveryAddress>(EMPTY_DELIVERY)
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [toppingUp, setToppingUp] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [shipDialogOpen, setShipDialogOpen] = useState(false)
  const [carrier, setCarrier] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [shipError, setShipError] = useState<string | null>(null)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputing, setDisputing] = useState(false)
  const [disputeError, setDisputeError] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<{ name: string; pieces: ConfettiPiece[] } | null>(null)
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingComment, setRatingComment] = useState("")
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [cryptoCoin, setCryptoCoin] = useState<CryptoCoin>("BTC")
  const [counterpartyRating, setCounterpartyRating] = useState<{ average: number | null; count: number } | null>(null)

  const counterpartyUserId = deal?.counterpartyUserId
  useEffect(() => {
    setCounterpartyRating(null)
    if (!counterpartyUserId) return
    let cancelled = false
    fetch(`/api/users/${counterpartyUserId}/public`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setCounterpartyRating({ average: data.ratingAverage, count: data.ratingCount })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [counterpartyUserId])

  const thread = deal ? chatThreads.find((t) => t.dealId === deal.id) ?? null : null
  const inviteUrl = useMemo(() => {
    if (!deal) return ""
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    return `${origin}/dashboard/deals/join/${deal.id}`
  }, [deal])

  async function runAction(action: DealAction, body?: Record<string, unknown>): Promise<boolean> {
    if (!deal) return false
    setActing(action)
    setActionError(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/${action}`, {
        method: "POST",
        ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error ?? "Something went wrong")
        return false
      }
      updateDeal(data)
      await refreshWallet()
      if (action === "confirm-receipt" || action === "release") {
        const name = action === "release" ? "You have" : `${data.counterpartyName ?? data.counterparty ?? "The seller"} has`
        setCelebration({ name, pieces: buildConfetti() })
        setTimeout(() => setCelebration(null), 3500)
      }
      return true
    } catch {
      setActionError("Network error — check your connection and try again")
      return false
    } finally {
      setActing(null)
    }
  }

  function openPayDialog(open: boolean) {
    setPayDialogOpen(open)
    setActionError(null)
    if (open && !delivery.street) {
      setDelivery(readLastDelivery(viewerId) ?? { ...EMPTY_DELIVERY, name: viewerName })
    }
  }

  async function handleConfirmPay() {
    if (!deal) return
    const trimmed = Object.fromEntries(Object.entries(delivery).map(([k, v]) => [k, v.trim()])) as unknown as DeliveryAddress
    const addressProblem = validateDeliveryAddress(trimmed)
    if (addressProblem) {
      setActionError(addressProblem)
      return
    }
    const ok = await runAction("accept", {
      // The server refuses to charge if the deal's amount no longer matches what the buyer saw here.
      expectedAmount: Math.round((deal.price + deal.shippingPrice) * 100) / 100,
      paymentMethod,
      paymentCryptoCoin: paymentMethod === "crypto" ? cryptoCoin : undefined,
      delivery: trimmed,
    })
    if (ok) {
      writeLastDelivery(viewerId, trimmed)
      setPayDialogOpen(false)
    }
  }

  /** No payment provider yet: the wallet is a demo ledger, so the buyer can add the missing amount here. */
  async function handleTopUpShortfall(amount: number) {
    setToppingUp(true)
    setActionError(null)
    try {
      const res = await fetch("/api/wallet/topup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setActionError(data.error ?? "Top-up failed")
      await refreshWallet()
    } finally {
      setToppingUp(false)
    }
  }

  function openAddressDialog() {
    if (!deal?.delivery) return
    setDelivery({ ...deal.delivery })
    setAddressError(null)
    setAddressDialogOpen(true)
  }

  async function handleSaveAddress() {
    if (!deal) return
    const problem = validateDeliveryAddress(delivery)
    if (problem) {
      setAddressError(problem)
      return
    }
    setSavingAddress(true)
    setAddressError(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/delivery/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddressError(data.error ?? "Could not save the address")
        return
      }
      updateDeal(data)
      writeLastDelivery(viewerId, delivery)
      setAddressDialogOpen(false)
    } finally {
      setSavingAddress(false)
    }
  }

  /** Opens the Shipments wizard with the buyer's address and the deal's box already filled in. */
  function handleBookLabel() {
    if (!deal?.delivery) return
    const existing = readShipmentDraft(viewerId)
    if (existing && !window.confirm("Replace your unfinished shipment draft with this deal's parcel?")) return
    const d = deal.delivery
    writeShipmentDraft(viewerId, {
      v: 1,
      savedAt: new Date().toISOString(),
      step: 1,
      sender: { name: viewerName, country: "", zip: "", city: "", street: "", phone: "", email: "", state: null },
      receiver: { name: d.name, country: d.country, zip: d.postcode, city: d.city, street: d.street, phone: d.phone, email: "", state: null },
      weightKg: "",
      lengthCm: deal.boxLengthCm ?? "",
      widthCm: deal.boxWidthCm ?? "",
      heightCm: deal.boxHeightCm ?? "",
      contents: deal.title.slice(0, 100),
      declaredValue: deal.price,
      hsCode: "",
      originCountry: "",
      itemCount: 1,
      exportReason: "commercial_goods",
      senderVat: "",
      selectedKey: null,
      pickupDate: "",
    })
    router.push("/dashboard/shipments/?new=1")
  }

  async function handleCopyInviteLink() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 1500)
    } catch {
      setInviteCopied(false)
    }
  }

  async function handleConfirmShip() {
    setShipError(null)
    if (carrier && carrier !== "Other" && !trackingNumber.trim()) {
      setShipError("Add the tracking number so the buyer can follow the parcel")
      return
    }
    const ok = await runAction("ship", {
      carrier: carrier.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
    })
    if (!ok) return
    setShipDialogOpen(false)
    setCarrier("")
    setTrackingNumber("")
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
      updateDeal(data.deal ?? { ...deal, status: "disputed" })
      setDisputeOpen(false)
      setDisputeReason("")
    } finally {
      setDisputing(false)
    }
  }

  async function handleSubmitRating() {
    if (!deal || ratingScore < 1) return
    setSubmittingRating(true)
    setRatingError(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: ratingScore, comment: ratingComment.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRatingError(data.error ?? "Failed to submit rating")
        return
      }
      updateDeal(data.deal)
      setRatingScore(0)
      setRatingComment("")
    } finally {
      setSubmittingRating(false)
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

  const activeStep = progressIndex(deal)
  const total = Math.round((deal.price + deal.shippingPrice) * 100) / 100
  const available = wallet?.available ?? null
  const shortfall = available !== null ? Math.max(0, Math.ceil((total - available) * 100) / 100) : 0
  const releaseAt = releaseAvailableAt(deal.shippedAt)
  const canRelease = deal.status === "shipped" && deal.myRole === "seller" && releaseAt !== null && releaseAt.getTime() <= Date.now()
  const counterpartyLabel = deal.counterpartyName ?? deal.counterparty

  // One clear primary action at a time — whoever's turn it is to move the deal forward.
  let primaryAction: { label: string; action: DealAction; hint: string } | null = null
  if (deal.status === "pending" && deal.myRole === "buyer" && deal.counterpartyJoined) {
    primaryAction = {
      label: `Accept & Pay ${deal.price + deal.shippingPrice} ${deal.currency} into Escrow`,
      action: "accept",
      hint: "Choose how you pay — funds are held in escrow until you confirm receipt.",
    }
  } else if (deal.status === "escrow" && deal.myRole === "seller") {
    primaryAction = { label: "Mark as Shipped", action: "ship", hint: "Let the buyer know their item is on its way." }
  } else if (deal.status === "shipped" && deal.myRole === "buyer") {
    primaryAction = {
      label: "Item received — release payment",
      action: "confirm-receipt",
      hint: "This releases the funds to the seller — only confirm once you've checked the item. Something wrong? Open a dispute instead.",
    }
  } else if (canRelease) {
    primaryAction = {
      label: `Release ${total} ${deal.currency} to my wallet`,
      action: "release",
      hint: "Buyer protection has ended without a confirmation or dispute.",
    }
  }

  const waitingMessage =
    deal.status === "pending" && deal.myRole === "seller"
      ? deal.counterpartyJoined
        ? "Waiting for the buyer to accept and pay."
        : `Waiting for ${counterpartyLabel} to join PayPack.`
      : deal.status === "pending" && deal.myRole === "buyer" && !deal.counterpartyJoined
        ? `Waiting for ${counterpartyLabel} to join PayPack before you can pay into escrow.`
        : deal.status === "escrow" && deal.myRole === "buyer"
        ? "Waiting for the seller to ship."
        : deal.status === "shipped" && deal.myRole === "seller"
          ? "Waiting for the buyer to confirm receipt."
          : deal.status === "disputed"
            ? "A dispute is open — PayPack support is reviewing it. Follow it in Support."
            : deal.status === "completed"
              ? "Deal completed — the payment was released to the seller."
              : deal.status === "cancelled"
                ? "This deal was cancelled."
                : null

  const canDispute = deal.status === "escrow" || deal.status === "shipped"
  const canCancel = deal.status === "pending" || deal.status === "escrow"

  return (
    <div>
      {showHeading && (
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          Deal Detail
        </h2>
      )}

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
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  STATUS_TONE[deal.status] ?? "bg-secondary text-secondary-foreground",
                )}
              >
                {deal.status === "escrow" ? "paid · in escrow" : deal.status}
              </span>
              <span>You&apos;re the {deal.myRole}</span>
            </div>
          </div>
          {deal.counterpartyJoined && deal.counterpartyUserId ? (
            <Link
              href={`/dashboard/users/${deal.counterpartyUserId}`}
              title={`View ${counterpartyLabel}'s profile`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80"
            >
              <User className="h-5 w-5 text-muted-foreground" />
            </Link>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {deal.counterpartyJoined && deal.counterpartyUserId ? (
          <Link
            href={`/dashboard/users/${deal.counterpartyUserId}`}
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 transition-colors hover:border-primary/30"
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {deal.myRole === "buyer" ? "Seller" : "Buyer"}
              </div>
              <div className="truncate text-sm font-semibold text-foreground">{counterpartyLabel}</div>
              {counterpartyRating && (
                <RatingStars score={counterpartyRating.average} count={counterpartyRating.count} size="sm" />
              )}
            </div>
            <span className="flex shrink-0 items-center text-xs font-medium text-primary">
              Profile <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ) : null}

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
                {(() => {
                  const at = [deal.createdAt, deal.paidAt, deal.shippedAt, deal.deliveredAt, deal.completedAt][i]
                  return at && i <= activeStep ? (
                    <span className="block text-[9px] text-muted-foreground/70">
                      {new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  ) : null
                })()}
              </span>
            </div>
          ))}
        </div>

        {/* Invite link — while waiting for a counterparty to join */}
        {!deal.counterpartyJoined && deal.status === "pending" && (
          <div className="pp-animate-slide-in mb-6 rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-2 text-sm font-semibold text-foreground">Invite your counterparty</div>
            <p className="mb-3 text-xs text-muted-foreground">
              Share this link — they'll join automatically once they open it and sign in.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs text-foreground">{inviteUrl}</span>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {inviteCopied ? <p className="mt-1 text-[11px] text-primary">Copied</p> : null}
          </div>
        )}

        {/* Shipping status — visible to both sides once the seller ships */}
        <ShippingStatusCard deal={deal} />

        {/* Delivery address — the buyer gives it when paying; the seller ships to it */}
        <DeliveryCard
          deal={deal}
          onEdit={deal.myRole === "buyer" && deal.status === "escrow" ? openAddressDialog : undefined}
        />
        <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base">Change delivery address</DialogTitle>
              <DialogDescription className="text-xs">The seller is notified right away. You can change it until the item ships.</DialogDescription>
            </DialogHeader>
            <DeliveryAddressForm value={delivery} onChange={setDelivery} />
            {addressError ? <p className="text-xs text-destructive">{addressError}</p> : null}
            <Button className="w-full rounded-xl bg-primary" disabled={savingAddress} onClick={handleSaveAddress}>
              {savingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save address"}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Chat */}
        {thread ? (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {thread.otherName ?? "Waiting for counterparty"}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {thread.lastMessage ?? (thread.otherJoined ? "No messages yet" : "They haven't joined yet")}
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
        ) : null}

        {/* Primary action — one clear next step, or a status message when it's the other side's turn */}
        {primaryAction?.action === "ship" ? (
          <div className="mb-3 space-y-2">
            <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full rounded-xl bg-primary py-5 text-sm font-semibold">
                  {primaryAction.label}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-base">Ship the item</DialogTitle>
                  <DialogDescription className="text-xs">
                    Post it with any carrier and add the tracking number — the buyer can follow the parcel from the deal.
                  </DialogDescription>
                </DialogHeader>
                {deal.delivery ? (
                  <div className="mt-2 rounded-xl border border-border bg-secondary/40 p-3 text-xs">
                    <div className="mb-1 font-semibold text-foreground">Ship to</div>
                    <div className="text-muted-foreground">
                      {deal.delivery.name}, {deal.delivery.street}, {deal.delivery.postcode} {deal.delivery.city}, {deal.delivery.country}
                    </div>
                    <button
                      type="button"
                      onClick={handleBookLabel}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-ship/40 bg-ship/10 px-3 py-2 text-xs font-semibold text-ship hover:bg-ship/15"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Book a courier label with PayPack Shipments
                    </button>
                  </div>
                ) : null}
                <div className="mt-3 space-y-3">
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    aria-label="Carrier"
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Carrier…</option>
                    {DEAL_CARRIERS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder={carrier === "Other" ? "Tracking number (optional)" : "Tracking number"}
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {shipError || actionError ? <p className="text-xs text-destructive">{shipError ?? actionError}</p> : null}
                <Button
                  className="mt-4 w-full rounded-xl bg-primary"
                  disabled={acting !== null}
                  onClick={handleConfirmShip}
                >
                  {acting === "ship" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Shipped"}
                </Button>
              </DialogContent>
            </Dialog>
            <p className="text-center text-xs text-muted-foreground">{primaryAction.hint}</p>
          </div>
        ) : primaryAction?.action === "accept" ? (
          <div className="mb-3 space-y-2">
            <Dialog open={payDialogOpen} onOpenChange={openPayDialog}>
              <DialogTrigger asChild>
                <Button className="w-full rounded-xl bg-primary py-5 text-sm font-semibold">
                  {primaryAction.label}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-base">Pay into escrow</DialogTitle>
                  <DialogDescription className="text-xs">
                    {deal.price + deal.shippingPrice} {deal.currency} is held safely until you confirm the item arrived.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-2">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Where should the seller ship it?</label>
                  <DeliveryAddressForm value={delivery} onChange={setDelivery} />
                </div>
                <div className="mt-2">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">How will you pay?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPaymentMethod(m.value)}
                        className={cn(
                          "rounded-xl border-2 px-2 py-2 text-xs font-medium transition-all",
                          paymentMethod === m.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30",
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === "crypto" && (
                    <div className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
                      <select
                        value={cryptoCoin}
                        onChange={(e) => setCryptoCoin(e.target.value as CryptoCoin)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {CRYPTO_COINS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <Coins className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="flex-1 truncate font-mono text-xs text-foreground">
                          {buildDemoCryptoAddress(cryptoCoin, deal.id)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Demo address for MVP preview — not monitored. Do not send real funds.</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5" />
                      Wallet balance
                    </span>
                    <span className={cn("font-semibold", shortfall > 0 ? "text-destructive" : "text-foreground")}>
                      {available !== null ? `${available.toFixed(2)} ${deal.currency}` : "…"}
                    </span>
                  </div>
                  {shortfall > 0 ? (
                    <button
                      type="button"
                      disabled={toppingUp}
                      onClick={() => handleTopUpShortfall(shortfall)}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
                    >
                      {toppingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Top up {shortfall.toFixed(2)} {deal.currency} (demo wallet)
                    </button>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No card is charged yet: the amount is held from your PayPack wallet until you confirm the item arrived.
                  </p>
                </div>
                {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
                <Button
                  className="mt-2 w-full rounded-xl bg-primary"
                  disabled={acting !== null || shortfall > 0}
                  onClick={handleConfirmPay}
                >
                  {acting === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${total} ${deal.currency} into escrow`}
                </Button>
              </DialogContent>
            </Dialog>
            <p className="text-center text-xs text-muted-foreground">{primaryAction.hint}</p>
          </div>
        ) : primaryAction ? (
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
        {actionError && !payDialogOpen && !shipDialogOpen ? (
          <p className="mb-3 text-center text-xs text-destructive">{actionError}</p>
        ) : null}

        {deal.status === "shipped" && !deal.deliveredAt && deal.myRole === "seller" ? (
          <Button
            variant="outline"
            className="mb-3 w-full rounded-xl border-ship/40 text-ship hover:bg-ship/10 hover:text-ship"
            disabled={acting !== null}
            onClick={() => runAction("delivered")}
          >
            {acting === "delivered" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <PackageCheck className="mr-1.5 h-4 w-4" />
                The carrier shows it as delivered
              </>
            )}
          </Button>
        ) : null}

        {deal.status === "completed" && !deal.hasRated && deal.counterpartyUserId && (
          <div className="mb-3 space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
            <p className="text-center text-sm font-medium text-foreground">
              Rate {counterpartyLabel}
            </p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingScore(n)}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      n <= ratingScore ? "fill-warning text-warning" : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Leave a comment (optional)"
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            {ratingError && <p className="text-center text-xs text-destructive">{ratingError}</p>}
            <Button
              className="w-full rounded-xl bg-primary"
              disabled={ratingScore < 1 || submittingRating}
              onClick={handleSubmitRating}
            >
              {submittingRating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit rating"}
            </Button>
          </div>
        )}

        {/* Secondary actions + deal details modal */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            disabled={!canCancel || acting !== null}
            onClick={() => setCancelConfirmOpen(true)}
            className="border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            {acting === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Deal"}
          </Button>
          <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base">Cancel this deal?</DialogTitle>
                <DialogDescription className="text-xs">
                  {deal.status === "escrow"
                    ? `The ${total} ${deal.currency} held in escrow goes back to the buyer's wallet. This can't be undone.`
                    : "The deal closes for both sides. This can't be undone."}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setCancelConfirmOpen(false)}>
                  Keep deal
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  disabled={acting !== null}
                  onClick={async () => {
                    const ok = await runAction("cancel")
                    if (ok) setCancelConfirmOpen(false)
                  }}
                >
                  {acting === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel deal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                      {deal.shippingPrice > 0 ? `${deal.shippingPrice} ${deal.currency}` : "—"}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg bg-secondary px-3 py-2">
                    <div className="text-muted-foreground">Box size</div>
                    <div className="text-sm font-semibold text-foreground">
                      {deal.boxLengthCm || deal.boxWidthCm || deal.boxHeightCm
                        ? `${deal.boxLengthCm ?? 0}×${deal.boxWidthCm ?? 0}×${deal.boxHeightCm ?? 0} cm`
                        : "—"}
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

        <DealTimeline deal={deal} viewerId={viewerId} />
      </div>

      {celebration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => setCelebration(null)}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {celebration.pieces.map((p, i) => (
              <span
                key={i}
                className="pp-confetti-piece"
                style={
                  {
                    "--pp-left": `${p.left}%`,
                    "--pp-color": p.color,
                    "--pp-delay": `${p.delay}s`,
                    "--pp-size": `${p.size}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="pp-animate-scale-in relative z-10 rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Funds released! 🎉</h3>
            <p className="mt-1 text-sm text-muted-foreground">{celebration.name} been paid.</p>
          </div>
        </div>
      )}
    </div>
  )
}
