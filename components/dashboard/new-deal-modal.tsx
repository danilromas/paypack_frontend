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
  ExternalLink,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import type { Deal } from "@/types";

const stepLabels = ["Role", "Product Link", "Item Details", "Summary"];

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
  const [itemTitle, setItemTitle] = useState("iPhone 15 (256 GB, Pink)")
  const [itemDetailDesc, setItemDetailDesc] = useState(
    "Lightly used, minor screen scratches. Fully functional. Comes with original box and charger.",
  )
  const [itemImageUrl, setItemImageUrl] = useState("")
  const [price, setPrice] = useState(500)
  const [shippingPrice, setShippingPrice] = useState(5)
  const [successOpen, setSuccessOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdDealId, setCreatedDealId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")
  const [confirmState, setConfirmState] = useState<"idle" | "ok" | "error">("idle")

  const fee = Math.round(price * 0.03 * 100) / 100
  const total = price + shippingPrice + fee

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
      setPrice(Math.round(importPrefill.price))
    }
    if (importPrefill.itemDetailDesc) setItemDetailDesc(importPrefill.itemDetailDesc)
    if (importPrefill.imageUrl) setItemImageUrl(importPrefill.imageUrl)
    setRole("buyer")
    setStep(3)
  }, [importPrefill])

  async function handleCreateDeal() {
    if (!role) return
    const parts = [
      itemDetailDesc.trim(),
      description.trim(),
      uploadedFile ? `File: ${uploadedFile.name}` : "",
      productLink.trim(),
    ].filter(Boolean)
    const payload = {
      title: itemTitle.trim() || "Untitled deal",
      description: parts.join(" · ") || "",
      imageUrl: itemImageUrl.trim() || null,
      price,
      shippingPrice,
      currency: "EUR",
      status: "pending" as const,
      role,
      counterparty: "Awaiting counterparty",
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
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
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
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
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

        {/* Step 2: Product Link */}
        {step === 2 && (
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
                  onClick={() => setStep(3)}
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
                onClick={() => setStep(3)}
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

        {/* Step 3: Item Details */}
        {step === 3 && (
          <div className="space-y-4">

            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Check item details
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-tight">
                We've fetched the information from the link. Please verify everything is correct.
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
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                  <textarea
                    rows={2}
                    value={itemDetailDesc}
                    onChange={(e) => setItemDetailDesc(e.target.value)}
                    className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Box size (cm)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      defaultValue={20}
                      className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center text-sm text-foreground"
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                    <input
                      type="number"
                      defaultValue={15}
                      className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center text-sm text-foreground"
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center text-sm text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Price</label>
                    <div className="flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">EUR</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Shipping</label>
                    <div className="flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={shippingPrice}
                        onChange={(e) => setShippingPrice(Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">EUR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(4)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90"
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
                <span className="max-w-[60%] text-right font-medium text-foreground">
                  {itemTitle || "Untitled deal"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium text-foreground">{price} EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-medium text-foreground">{shippingPrice} EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (3%):</span>
                <span className="font-medium text-foreground">{fee} EUR</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">{total} EUR</span>
                </div>
              </div>
            </div>
            {submitError && (
              <p className="mb-3 text-left text-sm text-destructive">{submitError}</p>
            )}
            <a
              href="https://awallet.tech"
              target="_blank"
              rel="noreferrer"
              className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#1b74e4]/30 bg-[#1b74e4]/10 py-3 text-sm font-semibold text-[#1b74e4] transition-all hover:bg-[#1b74e4]/15"
            >
              <ExternalLink className="h-4 w-4" />
              Pay via cryptotransfer aWallet
            </a>
            <button
              type="button"
              onClick={handleCreateDeal}
              disabled={submitting}
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
                  Share this QR code with your counterparty to join the deal.
                </p>
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
