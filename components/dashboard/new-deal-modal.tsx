"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Gift,
  Copy,
  Share2,
  MessageCircle,
  Info,
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
import { SERVICE_TIERS, estimateShippingCost } from "@/lib/shipping-rates";
import { containsCyrillic, LATIN_ONLY_MESSAGE } from "@/lib/text-validation";
import { scrapeListingViaExtension } from "@/lib/extension-bridge";

const SHIPPING_ESTIMATE_TIER = SERVICE_TIERS.find((t) => t.id === "standard") ?? SERVICE_TIERS[0];

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
  const router = useRouter()
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
  const [boxLengthCm, setBoxLengthCm] = useState(0)
  const [boxWidthCm, setBoxWidthCm] = useState(0)
  const [boxHeightCm, setBoxHeightCm] = useState(0)
  const [currency, setCurrency] = useState("EUR")
  const [sellerName, setSellerName] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdDealId, setCreatedDealId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sellerMessage, setSellerMessage] = useState("")
  const [messageCopied, setMessageCopied] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [counterpartyJoinedLive, setCounterpartyJoinedLive] = useState(false)
  const [joinedCounterpartyName, setJoinedCounterpartyName] = useState<string | null>(null)

  const phases = useMemo(() => getPhases(role), [role])
  const currentPhase: WizardPhase = phases[step - 1] ?? "role"

  const hasBoxSize = boxLengthCm > 0 || boxWidthCm > 0 || boxHeightCm > 0
  const hasFullBoxSize = boxLengthCm > 0 && boxWidthCm > 0 && boxHeightCm > 0
  // Shipping is estimated from the box's volumetric weight instead of being typed in by hand.
  const shippingEstimate = hasFullBoxSize
    ? estimateShippingCost(
        { weightKg: 0, lengthCm: boxLengthCm, widthCm: boxWidthCm, heightCm: boxHeightCm },
        SHIPPING_ESTIMATE_TIER,
      )
    : 0
  const fee = Math.round(price * 0.03 * 100) / 100
  const total = Math.round((price + shippingEstimate + fee) * 100) / 100
  const sellerReceives = Math.round((price + shippingEstimate - fee) * 100) / 100

  const hasCyrillic = [itemTitle, itemDetailDesc, sellerName, description].some(containsCyrillic)
  const detailsValid = itemTitle.trim().length > 0 && price > 0 && !hasCyrillic

  const sourcePlatform = useMemo(
    () => detectMarketplacePlatform(productLink),
    [productLink],
  )
  const isBuyerWithMarketplace = role === "buyer" && sourcePlatform === "facebook_marketplace"

  const inviteUrl = useMemo(() => {
    if (!createdDealId) return ""
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    return `${origin}/dashboard/deals/join/${createdDealId}`
  }, [createdDealId])

  const successSubtext = isBuyerWithMarketplace
    ? "Message the seller to confirm, or share this invite link another way."
    : role === "seller"
      ? "Share this invite link with your buyer so they can pay into escrow."
      : "Share this invite link with your counterparty to join the deal."

  useEffect(() => {
    if (!successOpen || !inviteUrl || !isBuyerWithMarketplace) return
    setSellerMessage(buildDefaultSellerMessage(itemTitle, inviteUrl))
  }, [successOpen, inviteUrl, isBuyerWithMarketplace, itemTitle])

  // Live-checks whether the counterparty has joined yet, so the success screen doesn't
  // just sit there — same 4s cadence chat already polls at.
  useEffect(() => {
    if (!successOpen || !createdDealId || counterpartyJoinedLive) return
    let cancelled = false
    let attempts = 0
    const interval = setInterval(async () => {
      attempts += 1
      if (attempts > 60) {
        clearInterval(interval)
        return
      }
      try {
        const res = await fetch(`/api/deals/${createdDealId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as Deal
        if (cancelled) return
        if (data.counterpartyJoined) {
          setCounterpartyJoinedLive(true)
          setJoinedCounterpartyName(data.counterpartyName ?? "Your counterparty")
          clearInterval(interval)
        }
      } catch {
        // transient — try again next tick
      }
    }, 4000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [successOpen, createdDealId, counterpartyJoinedLive])

  async function handleSendToSeller() {
    const link = productLink.trim()
    if (!link || !createdDealId || !sellerMessage.trim()) return
    const url = buildSellerMessageUrl(link, createdDealId, sellerMessage)
    // Without the extension nothing can type into Facebook for us, so put the text on the clipboard
    // first — the user only has to paste it into the seller chat.
    await handleCopyMessage()
    // No "noopener" feature string: with it window.open always returns null, which made every
    // click look like a blocked pop-up. Detach the opener manually instead.
    const win = window.open(url, "_blank")
    if (win) win.opener = null
    setPopupBlocked(!win)
  }

  async function loadLinkPreview() {
    const link = productLink.trim()
    if (!link) return
    setPreviewNotice(null)
    if (detectMarketplacePlatform(link) === "facebook_marketplace") {
      // FB serves listings only to logged-in browsers, so the extension reads it in the user's own browser.
      setPreviewLoading(true)
      try {
        const result = await scrapeListingViaExtension(link)
        if (result.status === "ok") {
          const { listing } = result
          if (listing.title) setItemTitle(listing.title.slice(0, 200))
          if (listing.desc) setItemDetailDesc(listing.desc.slice(0, 1000))
          if (listing.image) setItemImageUrl(listing.image)
          if (listing.price > 0) setPrice(Math.round(listing.price * 100) / 100)
        } else {
          setPreviewNotice(
            result.status === "no_extension"
              ? "To fill in Facebook listings automatically, install the PayPack browser extension from the /extension page. For now, please fill in the details below."
              : result.status === "login_required"
                ? "Log in to Facebook in this browser so the PayPack extension can read the listing — or fill in the details below."
                : "We couldn't read that Facebook listing — please fill in the details below.",
          )
        }
      } finally {
        setPreviewLoading(false)
        setStep(step + 1)
      }
      return
    }
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(link)}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't read the listing")
      let found = 0
      if (data.title) { setItemTitle(String(data.title).slice(0, 200)); found++ }
      if (data.description) { setItemDetailDesc(String(data.description).slice(0, 1000)); found++ }
      if (data.imageUrl) { setItemImageUrl(data.imageUrl); found++ }
      if (typeof data.price === "number" && data.price > 0) { setPrice(Math.round(data.price * 100) / 100); found++ }
      if (typeof data.currency === "string" && CURRENCIES.includes(data.currency.toUpperCase())) {
        setCurrency(data.currency.toUpperCase())
      }
      if (!found) setPreviewNotice("We couldn't find item details on that page — please fill them in below.")
    } catch (e) {
      setPreviewNotice(
        `${e instanceof Error ? e.message : "Couldn't read the listing"} — please fill in the details below.`,
      )
    } finally {
      setPreviewLoading(false)
      setStep(step + 1)
    }
  }

  async function handleCopyMessage() {
    if (!sellerMessage) return
    try {
      await navigator.clipboard.writeText(sellerMessage)
      setMessageCopied(true)
      setTimeout(() => setMessageCopied(false), 2500)
    } catch {
      setMessageCopied(false)
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
      shippingPrice: shippingEstimate,
      currency,
      role,
      counterparty:
        role === "buyer" ? sellerName.trim() || "Awaiting counterparty" : "Awaiting counterparty",
      sourceUrl: trimmedLink || null,
      sourcePlatform: detectMarketplacePlatform(trimmedLink),
      boxLengthCm: boxLengthCm > 0 ? boxLengthCm : null,
      boxWidthCm: boxWidthCm > 0 ? boxWidthCm : null,
      boxHeightCm: boxHeightCm > 0 ? boxHeightCm : null,
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
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  async function handleShare() {
    if (!inviteUrl) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my PayPack deal",
          url: inviteUrl,
        })
      } else {
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch {
      // user cancelled share
    }
  }

  const detailsHeading = role === "seller" ? "Describe what you're selling" : "Check item details"
  const detailsSubtext =
    role === "seller"
      ? "Add clear details so the buyer knows exactly what they're paying for."
      : productLink.trim() && !previewNotice
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
                  data-tour={r === "buyer" ? "role-buyer" : undefined}
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
                data-tour="role-next"
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
                {previewLoading ? "Reading the listing…" : "We'll fill in the item details from the listing when possible"}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && productLink.trim() && !previewLoading) loadLinkPreview()
                  }}
                />
                <button
                  onClick={loadLinkPreview}
                  disabled={!productLink?.trim() || previewLoading}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {previewLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
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
                data-tour="skip-link"
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
          <div className="space-y-4" data-tour="details-step">

            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {detailsHeading}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-tight">
                {detailsSubtext}
              </p>
            </div>

            {previewNotice && role === "buyer" && (
              <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{previewNotice}</span>
              </div>
            )}

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
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Box size (cm, optional)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={boxLengthCm || ""}
                      onChange={(e) => setBoxLengthCm(Number(e.target.value) || 0)}
                      placeholder="L"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={boxWidthCm || ""}
                      onChange={(e) => setBoxWidthCm(Number(e.target.value) || 0)}
                      placeholder="W"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={boxHeightCm || ""}
                      onChange={(e) => setBoxHeightCm(Number(e.target.value) || 0)}
                      placeholder="H"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {hasFullBoxSize
                      ? `Estimated shipping: ${shippingEstimate.toFixed(2)} ${currency} (${SHIPPING_ESTIMATE_TIER.label}, ${SHIPPING_ESTIMATE_TIER.eta})`
                      : "Enter length, width and height to estimate shipping."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {!detailsValid && (
                <p className="text-xs text-destructive">
                  {hasCyrillic ? LATIN_ONLY_MESSAGE : "Title and a price greater than 0 are required."}
                </p>
              )}
              <button
                data-tour="details-next"
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
              {hasBoxSize && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Box size:</span>
                  <span className="font-medium text-foreground">
                    {boxLengthCm || 0}×{boxWidthCm || 0}×{boxHeightCm || 0} cm
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping (est.):</span>
                <span className="font-medium text-foreground">
                  {hasFullBoxSize ? `${shippingEstimate.toFixed(2)} ${currency}` : "Add box size"}
                </span>
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
                  <span className="text-primary">{total.toFixed(2)} {currency}</span>
                </div>
                {role === "seller" && (
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>You receive:</span>
                    <span className="font-medium text-foreground">{sellerReceives.toFixed(2)} {currency}</span>
                  </div>
                )}
              </div>
            </div>

            {role === "buyer" && (
              <p className="mb-4 text-xs text-muted-foreground">
                You&apos;ll choose how to pay once the seller joins the deal — nothing is charged now.
              </p>
            )}

            {submitError && (
              <p className="mb-3 text-left text-sm text-destructive">{submitError}</p>
            )}
            <button
              type="button"
              data-tour="create-deal-button"
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
          <div className="absolute inset-0 grid place-items-center p-3 sm:p-4">
            {/* dvh + two columns on wider screens keep this inside short browser windows (bookmarks bar, taskbar). */}
            <div
              className={cn(
                "relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-3xl border border-border bg-card p-5 text-center shadow-2xl sm:p-6",
                isBuyerWithMarketplace ? "max-w-3xl" : "max-w-md",
              )}
            >
              <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-3">
                  <div className="pp-animate-scale-in grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
                    <Gift className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Deal Created!</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{successSubtext}</p>

                {counterpartyJoinedLive && (
                  <div className="pp-animate-slide-in mt-3 flex items-center justify-center gap-2 rounded-xl bg-success/10 px-4 py-2 text-sm font-medium text-success">
                    ✓ {joinedCounterpartyName} joined the deal!
                  </div>
                )}

                <div className={cn("mt-5 grid gap-4 text-left", isBuyerWithMarketplace && "sm:grid-cols-[1fr_auto]")}>
                  {isBuyerWithMarketplace && (
                    <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                        Message seller on Facebook Marketplace
                      </p>
                      <textarea
                        value={sellerMessage}
                        onChange={(e) => setSellerMessage(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        &quot;Send to seller&quot; copies this message and opens the listing. With the PayPack extension
                        it&apos;s sent automatically; otherwise just paste it into the chat with the seller.
                      </p>
                      {messageCopied && !popupBlocked && (
                        <p className="mt-1.5 text-[11px] font-medium text-success">
                          Message copied — paste it into the seller chat (Ctrl+V).
                        </p>
                      )}
                      {popupBlocked && (
                        <p className="mt-1.5 text-[11px] text-destructive">
                          Your browser blocked the new tab. The message is copied — open the listing yourself and paste it.
                        </p>
                      )}
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

                  <div className="flex flex-col items-center">
                    <div
                      data-tour="invite-link-card"
                      className="pp-animate-slide-in w-fit rounded-2xl bg-background p-2.5 shadow-inner"
                    >
                      <div className="rounded-xl bg-white p-1.5">
                        <QRCodeSVG value={inviteUrl || "pending"} size={132} includeMargin level="M" />
                      </div>
                      <p className="mt-2 max-w-[180px] break-all text-center font-mono text-[10px] text-muted-foreground">
                        {inviteUrl || "—"}
                      </p>
                    </div>
                    <div className="mt-3 grid w-full max-w-[220px] grid-cols-2 gap-2">
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? "Copied" : "Copy link"}
                      </button>
                      <button
                        onClick={handleShare}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
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
                      router.push("/dashboard/deals")
                    }}
                    className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  >
                    Open deal
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
