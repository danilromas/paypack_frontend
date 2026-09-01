"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Gift,
  Copy,
  Share2,
  CheckCircle2,
  MessageCircle,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import type { Deal } from "@/types";
import {
  detectMarketplacePlatform,
  buildDefaultSellerMessage,
  buildSellerMessageUrl,
} from "@/lib/marketplace";
import {
  PAYMENT_METHODS,
  CRYPTO_COINS,
  buildDemoCryptoAddress,
  type PaymentMethod,
  type CryptoCoin,
} from "@/lib/payments";

const CURRENCIES = ["EUR", "USD", "GBP"];

type WizardPhase = "role" | "link" | "details" | "summary";

const PHASE_LABELS: Record<WizardPhase, string> = {
  role: "Role",
  link: "Marketplace Link",
  details: "Item Details",
  summary: "Summary",
};

/** Seller skips the marketplace-link step — they're not buying from anywhere. */
function getPhases(role: "buyer" | "seller" | null): WizardPhase[] {
  if (role === "seller") return ["role", "details", "summary"];
  return ["role", "link", "details", "summary"];
}

/** Поля с расширения / query `pp_import=1` */
export type DealImportPrefill = {
  productLink?: string;
  title?: string;
  price?: number;
  itemDetailDesc?: string;
  imageUrl?: string;
};

export function NewDealModal({
  importPrefill,
}: {
  importPrefill?: DealImportPrefill | null;
}) {
  const { setNewDealModalOpen, addDeal } = useAppStore()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<"buyer" | "seller" | null>(null)
  const [productLink, setProductLink] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [itemTitle, setItemTitle] = useState("")
  const [itemDetailDesc, setItemDetailDesc] = useState("")
  const [itemImageUrl, setItemImageUrl] = useState("")
  const [price, setPrice] = useState(0)
  const [shippingPrice, setShippingPrice] = useState(0)
  const [currency, setCurrency] = useState("EUR")
  const [sellerName, setSellerName] = useState("")
  const [counterpartyEmail, setCounterpartyEmail] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [cryptoCoin, setCryptoCoin] = useState<CryptoCoin>("BTC")
  const [cryptoAddressCopied, setCryptoAddressCopied] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdDealId, setCreatedDealId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")
  const [confirmState, setConfirmState] = useState<"idle" | "ok" | "error">("idle")
  const [sellerMessage, setSellerMessage] = useState("")
  const [messageCopied, setMessageCopied] = useState(false)

  const phases = useMemo(() => getPhases(role), [role])
  const currentPhase: WizardPhase = phases[step - 1] ?? "role"

  const fee = Math.round(price * 0.03 * 100) / 100
  const total = price + shippingPrice + fee
  const sellerReceives = Math.round((price + shippingPrice - fee) * 100) / 100

  const counterpartyEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(counterpartyEmail.trim())
  const detailsValid = itemTitle.trim().length > 0 && price > 0 && counterpartyEmailValid

  const sourcePlatform = useMemo(
    () => detectMarketplacePlatform(productLink),
    [productLink],
  )
  const isBuyerWithMarketplace = role === "buyer" && sourcePlatform === "facebook_marketplace"

  const sharePayload = useMemo(() => {
    if (!createdDealId) return ""
    return JSON.stringify({
      type: "deal-confirm",
      dealId: createdDealId,
      role,
      ts: Date.now(),
    })
  }, [createdDealId, role])

  const confirmUrl = useMemo(() => {
    if (!sharePayload) return ""
    return `/dashboard/deals/confirm?payload=${encodeURIComponent(sharePayload)}`
  }, [sharePayload])

  const successSubtext = isBuyerWithMarketplace
    ? "Message the seller to confirm, or share this QR code another way."
    : role === "seller"
      ? "Share this with your buyer so they can pay into escrow."
      : "Share this QR code with your counterparty to join the deal."

  useEffect(() => {
    if (!successOpen || !confirmUrl || !isBuyerWithMarketplace) return
    const absoluteConfirmUrl =
      typeof window !== "undefined" ? `${window.location.origin}${confirmUrl}` : confirmUrl
    setSellerMessage(buildDefaultSellerMessage(itemTitle, absoluteConfirmUrl))
  }, [successOpen, confirmUrl, isBuyerWithMarketplace, itemTitle])

  function handleSendToSeller() {
    const link = productLink.trim()
    if (!link || !createdDealId || !sellerMessage.trim()) return
    const url = buildSellerMessageUrl(link, createdDealId, sellerMessage)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  async function handleCopyMessage() {
    if (!sellerMessage) return
    try {
      await navigator.clipboard.writeText(sellerMessage)
      setMessageCopied(true)
      setTimeout(() => setMessageCopied(false), 1500)
    } catch {
      setMessageCopied(false)
    }
  }

  const cryptoCoinLabel = CRYPTO_COINS.find((c) => c.value === cryptoCoin)?.label ?? cryptoCoin
  const cryptoAddress = useMemo(
    () => (createdDealId ? buildDemoCryptoAddress(cryptoCoin, createdDealId) : ""),
    [cryptoCoin, createdDealId],
  )

  async function handleCopyCryptoAddress() {
    if (!cryptoAddress) return
    try {
      await navigator.clipboard.writeText(cryptoAddress)
      setCryptoAddressCopied(true)
      setTimeout(() => setCryptoAddressCopied(false), 1500)
    } catch {
      setCryptoAddressCopied(false)
    }
  }

  useEffect(() => {
    if (!importPrefill) return
    const hasData =
      importPrefill.productLink ||
      importPrefill.title ||
      importPrefill.price ||
      importPrefill.itemDetailDesc ||
      importPrefill.imageUrl
    if (!hasData) return
    if (importPrefill.productLink) setProductLink(importPrefill.productLink)
    if (importPrefill.title) setItemTitle(importPrefill.title)
    if (
      importPrefill.price != null &&
      Number.isFinite(importPrefill.price) &&
      importPrefill.price > 0
    ) {
      setPrice(Math.round(importPrefill.price * 100) / 100)
    }
    if (importPrefill.itemDetailDesc) setItemDetailDesc(importPrefill.itemDetailDesc)
    if (importPrefill.imageUrl) setItemImageUrl(importPrefill.imageUrl)
    setRole("buyer")
    setStep(getPhases("buyer").indexOf("details") + 1)
  }, [importPrefill])

  async function handleCreateDeal() {
    if (!role || !detailsValid) return
    const parts = [
      itemDetailDesc.trim(),
      description.trim(),
      uploadedFile ? `File: ${uploadedFile.name}` : "",
    ].filter(Boolean)
    const trimmedLink = productLink.trim()
    const payload = {
      title: itemTitle.trim() || "Untitled deal",
      description: parts.join(" · ") || "",
      imageUrl: itemImageUrl.trim() || null,
      price,
      shippingPrice,
      currency,
      role,
      counterparty:
        role === "buyer" ? sellerName.trim() || "Awaiting counterparty" : "Awaiting counterparty",
      counterpartyEmail: counterpartyEmail.trim().toLowerCase(),
      sourceUrl: trimmedLink || null,
      sourcePlatform: detectMarketplacePlatform(trimmedLink),
      paymentMethod: role === "buyer" ? paymentMethod : null,
      paymentCryptoCoin: role === "buyer" && paymentMethod === "crypto" ? cryptoCoin : null,
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as Deal & { error?: string }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to create deal",
        )
      }
      addDeal(data)
      setCreatedDealId(data.id)
      setSuccessOpen(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create deal")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy() {
    if (!sharePayload) return
    try {
      await navigator.clipboard.writeText(sharePayload)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  async function handleShare() {
    if (!sharePayload) return
    const text = `PayPack deal confirmation payload:\n${sharePayload}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Deal confirmation",
          text,
          url: confirmUrl,
        })
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch {
      // user cancelled share
    }
  }

  function handleConfirmFromScan() {
    try {
      const parsed = JSON.parse(confirmInput)
      if (parsed?.type === "deal-confirm" && parsed?.dealId === createdDealId) {
        setConfirmState("ok")
      } else {
        setConfirmState("error")
      }
    } catch {
      setConfirmState("error")
    }
  }

  const detailsHeading = role === "seller" ? "Describe what you're selling" : "Check item details"
  const detailsSubtext =
    role === "seller"
      ? "Add clear details so the buyer knows exactly what they're paying for."
      : productLink.trim()
        ? "We've fetched the information from the link. Please verify everything is correct."
        : "Fill in the title and details for this item."

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-0 backdrop-blur-sm sm:p-4">
      <div className="h-full w-full overflow-y-auto rounded-none border-0 bg-card p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-border sm:p-8">
        {/* Header with integrated progress */}
        <div className="mb-8 flex items-center justify-between">
          {/* Left side - Back button or placeholder */}
          <div className="flex items-center">
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
          </div>

          {/* Center - Progress Steps */}
          <div className="flex items-center gap-2">
            {phases.map((phase, i) => (
              <div key={phase} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                    i + 1 <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-sm sm:block",
                    i + 1 <= step
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {PHASE_LABELS[phase]}
                </span>
                {i < phases.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 w-8",
                      i + 1 < step ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Right side - Close button */}
          <div className="flex items-center">
            <button
              onClick={() => setNewDealModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Phase: Role */}
        {currentPhase === "role" && (
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
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2",
                      role === r ? "border-primary" : "border-muted-foreground",
                    )}
                  >
                    {role === r && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-lg font-medium capitalize",
                      role === r ? "text-foreground" : "text-muted-foreground",
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

        {/* Phase: Marketplace Link (buyer only) */}
        {currentPhase === "link" && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                Paste Product Link
              </h3>
              <p className="text-xs text-muted-foreground">
                Product name will appear if found
              </p>
            </div>

            {/* Ссылка */}
            <div className="mx-auto max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste product link here"
                  className="w-full rounded-xl border border-border bg-secondary px-5 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                />
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!productLink?.trim()}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/*  or */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <div className="mx-auto max-w-md">
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="w-full rounded-xl border border-border bg-secondary/80 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Continue without link
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Fill in title and details on the next step
              </p>
            </div>

            {/* Upload file + description */}
            <div className="mx-auto max-w-md space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Upload document (optional)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 px-4 py-5 text-center hover:border-primary/50">
                  <input
                    type="file"
                    className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setUploadedFile(file)
                            setDescription("")
                          }
                        }}
                  />
                  <svg className="mb-2 h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-foreground">Click or drag file</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, up to 10 MB</p>
                  {uploadedFile && (
                    <p className="mt-2 text-xs text-primary truncate max-w-[260px]">
                      {uploadedFile.name}
                    </p>
                  )}
                </label>
              </div>

              {!uploadedFile && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Description (if no file)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional info about the deal..."
                    className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase: Item Details */}
        {currentPhase === "details" && (
          <div className="space-y-4">

            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {detailsHeading}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-tight">
                {detailsSubtext}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-5">

              {/* Product image */}
              <div className="space-y-2">
                <div className="aspect-[4/3] w-full max-w-[340px] mx-auto overflow-hidden rounded-xl border border-border bg-secondary">
                  {itemImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={itemImageUrl}
                      alt="Imported product"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Product Image Preview
                    </div>
                  )}
                </div>
                <input
                  type="url"
                  value={itemImageUrl}
                  onChange={(e) => setItemImageUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Правая колонка — форма */}
              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                  <input
                    type="text"
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    placeholder="e.g. iPhone 15 (256 GB, Pink)"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                  <textarea
                    rows={2}
                    value={itemDetailDesc}
                    onChange={(e) => setItemDetailDesc(e.target.value)}
                    placeholder="Condition, what's included, anything the other side should know..."
                    className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {role === "buyer" && (
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Seller name (optional)
                    </label>
                    <input
                      type="text"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="e.g. Maria K."
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {role === "buyer" ? "Seller's" : "Buyer's"} email
                  </label>
                  <input
                    type="email"
                    value={counterpartyEmail}
                    onChange={(e) => setCounterpartyEmail(e.target.value)}
                    placeholder="counterparty@email.com"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    They'll need this to join the deal — it can't move to escrow until they do.
                  </p>
                  {counterpartyEmail.trim().length > 0 && !counterpartyEmailValid && (
                    <p className="mt-1 text-[11px] text-destructive">Enter a valid email.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Price</label>
                    <div className="flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={price || ""}
                        onChange={(e) => setPrice(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">{currency}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Shipping</label>
                    <div className="flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={shippingPrice || ""}
                        onChange={(e) => setShippingPrice(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">{currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {!detailsValid && (
                <p className="text-xs text-destructive">
                  Title, a price greater than 0, and a valid counterparty email are required.
                </p>
              )}
              <button
                onClick={() => setStep(step + 1)}
                disabled={!detailsValid}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

          </div>
        )}

        {/* Phase: Summary */}
        {currentPhase === "summary" && (
          <div className="mx-auto max-w-md text-center">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Deal Summary
            </h3>
            <div className="mb-8 space-y-3 rounded-2xl border border-border bg-secondary p-6 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item:</span>
                <span className="max-w-[60%] text-right font-medium text-foreground">
                  {itemTitle || "Untitled deal"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium text-foreground">{price} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-medium text-foreground">{shippingPrice} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (3%):</span>
                <span className="font-medium text-foreground">{fee} {currency}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">
                    {role === "seller" ? "Total (buyer pays):" : "Total (you pay):"}
                  </span>
                  <span className="text-primary">{total} {currency}</span>
                </div>
                {role === "seller" && (
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>You receive:</span>
                    <span className="font-medium text-foreground">{sellerReceives} {currency}</span>
                  </div>
                )}
              </div>
            </div>

            {role === "buyer" && (
              <div className="mb-6 text-left">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  How will you pay?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 text-xs font-medium transition-all",
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
                  <div className="mt-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Coin</label>
                    <select
                      value={cryptoCoin}
                      onChange={(e) => setCryptoCoin(e.target.value as CryptoCoin)}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    >
                      {CRYPTO_COINS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {submitError && (
              <p className="mb-3 text-left text-sm text-destructive">{submitError}</p>
            )}
            <button
              type="button"
              onClick={handleCreateDeal}
              disabled={submitting || !detailsValid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Deal"
              )}
            </button>
          </div>
        )}
      </div>
      {successOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/80 backdrop-blur-sm" />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative z-10">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
                  <Gift className="h-9 w-9" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Deal Created!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {successSubtext}
                </p>

                {isBuyerWithMarketplace && (
                  <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-3 text-left">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      Message seller on Facebook Marketplace
                    </p>
                    <textarea
                      value={sellerMessage}
                      onChange={(e) => setSellerMessage(e.target.value)}
                      rows={3}
                      className="h-20 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Opens the listing and sends this via the PayPack browser extension, if installed. Otherwise copy it and paste manually.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={handleCopyMessage}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {messageCopied ? "Copied" : "Copy message"}
                      </button>
                      <button
                        onClick={handleSendToSeller}
                        disabled={!sellerMessage.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Send to seller
                      </button>
                    </div>
                  </div>
                )}

                <div className="mx-auto mt-6 w-fit rounded-2xl bg-background p-3 shadow-inner">
                  <div className="rounded-xl bg-white p-2">
                    <QRCodeSVG
                      value={sharePayload || "pending"}
                      size={160}
                      includeMargin
                      level="M"
                    />
                  </div>
                  <p className="mt-3 break-all text-[10px] font-mono text-muted-foreground">
                    DEAL: {createdDealId ?? "—"}
                  </p>
                </div>
                {isBuyerWithMarketplace && (
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">
                    Or share this QR code another way
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy payload"}
                  </button>
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                </div>

                {role === "buyer" && paymentMethod === "crypto" && createdDealId && (
                  <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3 text-left">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Coins className="h-3.5 w-3.5 text-primary" />
                      Pay with {cryptoCoinLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Send the agreed amount (~{total} {currency}) using {cryptoCoinLabel} to the address below.
                    </p>
                    <div className="mx-auto mt-3 w-fit rounded-2xl bg-background p-3 shadow-inner">
                      <div className="rounded-xl bg-white p-2">
                        <QRCodeSVG value={cryptoAddress} size={140} includeMargin level="M" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                      <span className="flex-1 truncate font-mono text-xs text-foreground">
                        {cryptoAddress}
                      </span>
                      <button
                        onClick={handleCopyCryptoAddress}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {cryptoAddressCopied && (
                      <p className="mt-1 text-[10px] text-primary">Copied</p>
                    )}
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Demo address for MVP preview — not monitored. Do not send real funds.</span>
                    </div>
                  </div>
                )}

                <a
                  href={confirmUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "mt-2 inline-flex w-full items-center justify-center rounded-xl border border-border py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary",
                    !confirmUrl && "pointer-events-none opacity-50",
                  )}
                >
                  Open confirm page
                </a>

                <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3 text-left">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Simulate scan confirmation
                  </p>
                  <textarea
                    value={confirmInput}
                    onChange={(e) => {
                      setConfirmInput(e.target.value)
                      setConfirmState("idle")
                    }}
                    placeholder="Paste scanned payload here..."
                    className="h-20 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      onClick={handleConfirmFromScan}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90"
                    >
                      Confirm via scan
                    </button>
                    {confirmState === "ok" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirmed
                      </span>
                    )}
                    {confirmState === "error" && (
                      <span className="text-xs font-medium text-destructive">
                        Invalid payload
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setSuccessOpen(false)
                      setNewDealModalOpen(false)
                    }}
                    className="rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSuccessOpen(false)
                      setNewDealModalOpen(false)
                    }}
                    className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  >
                    Go to dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
