"use client"

import { useState } from "react"
import { X, ChevronLeft, ChevronRight, Gift } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { cn } from "@/lib/utils"

const stepLabels = ["Role", "Product Link", "Item Details", "Summary"]

export function NewDealModal() {
  const { setNewDealModalOpen } = useAppStore()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<"buyer" | "seller" | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="w-6" />
          )}
          <div className="flex flex-1 items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <Gift className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-primary">NEW DEAL</h2>
          </div>
          <button
            onClick={() => setNewDealModalOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="mb-8 flex justify-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                  i + 1 <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-sm sm:block",
                  i + 1 <= step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8",
                    i + 1 < step ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <div>
            <h3 className="mb-8 text-center text-xl font-semibold text-foreground">
              Your Role
            </h3>
            <div className="mx-auto max-w-md space-y-4">
              {(["buyer", "seller"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
                    role === r
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2",
                      role === r ? "border-primary" : "border-muted-foreground"
                    )}
                  >
                    {role === r && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-lg font-medium capitalize",
                      role === r
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {r}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!role}
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Product Link */}
        {step === 2 && (
          <div>
            <h3 className="mb-2 text-center text-xl font-semibold text-foreground">
              Paste Product Link
            </h3>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Product name will appear here if it exists
            </p>
            <div className="mx-auto max-w-lg">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste product link here:"
                  className="w-full rounded-2xl border border-border bg-secondary px-6 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => setStep(3)}
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Item Details */}
        {step === 3 && (
          <div>
            <h3 className="mb-2 text-center text-xl font-semibold text-foreground">
              Check item details
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {"We've fetched the information from the link. Please verify everything is correct."}
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Product Image Placeholder */}
              <div className="space-y-4">
                <div className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-secondary">
                  <span className="text-muted-foreground">
                    Product Image Preview
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["Front", "Back", "Side"].map((label) => (
                    <div
                      key={label}
                      className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-border bg-secondary text-xs text-muted-foreground transition-all hover:ring-2 hover:ring-primary"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              {/* Details Form */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">
                    Title
                  </label>
                  <input
                    type="text"
                    defaultValue="iPhone 15 (256 GB, Pink)"
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Lightly used, minor screen scratches. Fully functional. Comes with original box and charger."
                    className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-muted-foreground">
                    Box size (cm)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={20}
                      className="w-20 rounded-lg border border-border bg-secondary px-3 py-2 text-center text-foreground"
                    />
                    <span className="text-muted-foreground">x</span>
                    <input
                      type="number"
                      defaultValue={15}
                      className="w-20 rounded-lg border border-border bg-secondary px-3 py-2 text-center text-foreground"
                    />
                    <span className="text-muted-foreground">x</span>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-20 rounded-lg border border-border bg-secondary px-3 py-2 text-center text-foreground"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">
                      Price
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3">
                      <input
                        type="number"
                        defaultValue={500}
                        className="w-full bg-transparent text-foreground focus:outline-none"
                      />
                      <span className="text-muted-foreground">EUR</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">
                      Shipping
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3">
                      <input
                        type="number"
                        defaultValue={5}
                        className="w-full bg-transparent text-foreground focus:outline-none"
                      />
                      <span className="text-muted-foreground">EUR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(4)}
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="mx-auto max-w-md text-center">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Deal Summary
            </h3>
            <div className="mb-8 space-y-3 rounded-2xl border border-border bg-secondary p-6 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-medium text-foreground">
                  iPhone 15 (256 GB, Pink)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium text-foreground">500 EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-medium text-foreground">5 EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (3%):</span>
                <span className="font-medium text-foreground">15 EUR</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">520 EUR</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setNewDealModalOpen(false)}
              className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              Create Deal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
