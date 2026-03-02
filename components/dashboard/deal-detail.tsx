"use client"

import { FileText, User } from "lucide-react"
import { useAppStore, mockDeals } from "@/store/app-store"
import { cn } from "@/lib/utils"

const progressSteps = ["Created", "Funds Locked", "Shipped", "In Transit", "Received"]

export function DealDetail() {
  const { selectedDealId } = useAppStore()
  const deal = mockDeals.find((d) => d.id === selectedDealId) || mockDeals[0]

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

      <div className="sticky top-0 rounded-2xl border border-border bg-card p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-lg font-bold text-primary">
              {deal.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                #{deal.id.padStart(8, "2531149")}
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex justify-between">
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
              <span className="text-center text-[10px] text-muted-foreground">
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

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button className="rounded-lg border border-border bg-card py-2 text-xs font-medium text-muted-foreground transition-all hover:border-success/30 hover:bg-success/10 hover:text-success">
            Confirm Receipt
          </button>
          <button className="rounded-lg border border-border bg-card py-2 text-xs font-medium text-muted-foreground transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
            Open Dispute
          </button>
          <button className="rounded-lg border border-border bg-card py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
            Release Funds
          </button>
        </div>
      </div>
    </div>
  )
}
