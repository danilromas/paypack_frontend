"use client"

import { FileText, User } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { cn, formatDealDateTime } from "@/lib/utils"
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
  const { selectedDealId, deals } = useAppStore()
  const deal =
    deals.find((d) => d.id === selectedDealId) ?? deals[0]

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

        {/* Chat Preview */}
        <div className="mb-6 max-h-48 space-y-3 overflow-y-auto">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-border bg-secondary px-4 py-2">
              <p className="text-sm text-muted-foreground">
                Me: Please ship the phone soon.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              M
            </div>
            <div className="rounded-2xl rounded-tl-none border border-primary/20 bg-primary/5 px-4 py-2">
              <p className="text-sm text-foreground">
                {deal.counterparty.split(" ")[0]}: Ok.
              </p>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Enter your message here..."
            className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
            Open Chat
          </button>
        </div>

        {/* Action Buttons + deal details modal */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            className="border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:border-success/30 hover:bg-success/10 hover:text-success"
          >
            Confirm Receipt
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
