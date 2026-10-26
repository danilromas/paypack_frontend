"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, Lock, ShieldCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Same platform fee the in-app deal form shows.
const FEE_RATE = 0.03

interface Seller {
  id: string
  name: string
  kycStatus: string
  ratingAverage: number | null
  ratingCount: number
  completedDealsCount: number
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** postMessage target for the partner page — only a well-formed http(s) origin, never "*". */
function partnerOrigin(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null
  } catch {
    return null
  }
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function CheckoutContent() {
  const params = useSearchParams()
  const item = useMemo(
    () => ({
      sellerId: params.get("seller") ?? "",
      title: params.get("title") ?? "",
      description: params.get("description") ?? "",
      price: Number(params.get("price")),
      shippingPrice: Number(params.get("shipping") ?? 0) || 0,
      currency: (params.get("currency") ?? "EUR").toUpperCase(),
      imageUrl: params.get("image"),
      sourceUrl: params.get("source"),
    }),
    [params],
  )
  const origin = partnerOrigin(params.get("origin"))

  const [seller, setSeller] = useState<Seller | null>(null)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dealId, setDealId] = useState<string | null>(null)

  const invalid = !item.sellerId || !item.title || !(item.price > 0)

  useEffect(() => {
    if (invalid) {
      setLoading(false)
      return
    }
    Promise.all([
      fetch(`/api/widget/sellers/${encodeURIComponent(item.sellerId)}`, { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<Seller>) : null,
      ),
      fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.ok),
    ])
      .then(([s, me]) => {
        setSeller(s)
        setSignedIn(me)
      })
      .finally(() => setLoading(false))
  }, [invalid, item.sellerId])

  const fee = round2(item.price * FEE_RATE)
  const total = round2(item.price + item.shippingPrice + fee)
  const money = (n: number) => `${n.toFixed(2)} ${item.currency}`
  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/checkout"

  async function confirm() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/widget/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Couldn't create the deal")
        return
      }
      setDealId(data.dealId)
      if (window.opener && origin) {
        window.opener.postMessage({ type: "paypack:deal_created", dealId: data.dealId }, origin)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading checkout…
      </div>
    )
  }

  if (invalid || !seller) {
    return (
      <Card className="rounded-2xl border-border p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
        <h1 className="mt-3 text-lg font-semibold">This checkout link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {invalid ? "The item details are incomplete." : "The seller can't accept payments right now."} Please contact the seller.
        </p>
      </Card>
    )
  }

  if (dealId) {
    return (
      <Card className="rounded-2xl border-border p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h1 className="mt-3 text-lg font-semibold">Deal created</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fund it into escrow from your PayPack dashboard. {seller.name} ships once it&apos;s funded, and the money is
          released only after you confirm delivery.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-xl">
            <Link href={`/dashboard/deals/?deal=${dealId}`}>Open deal</Link>
          </Button>
          {typeof window !== "undefined" && window.opener ? (
            <Button variant="outline" className="rounded-xl" onClick={() => window.close()}>
              Back to shop
            </Button>
          ) : null}
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border p-0">
      <div className="flex gap-4 border-b border-border p-5">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug">{item.title}</h1>
          {item.description ? <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.description}</p> : null}
          {hostnameOf(item.sourceUrl) ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">from {hostnameOf(item.sourceUrl)}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Seller</div>
            <div className="font-medium">{seller.name}</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {seller.kycStatus === "approved" ? (
              <div className="flex items-center justify-end gap-1 text-success">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-1">
              <Star className="h-3.5 w-3.5" />
              {seller.ratingAverage !== null ? `${seller.ratingAverage.toFixed(1)} (${seller.ratingCount})` : "No ratings yet"}
            </div>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Item</dt>
            <dd>{money(item.price)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{money(item.shippingPrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">PayPack protection (3%)</dt>
            <dd>{money(fee)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(total)}</dd>
          </div>
        </dl>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {signedIn ? (
          <Button className="w-full rounded-xl" disabled={submitting} onClick={confirm}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Create secure deal
          </Button>
        ) : (
          <Button asChild className="w-full rounded-xl">
            <Link href={`/auth/?redirect=${encodeURIComponent(here)}`}>Sign in to continue</Link>
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Nothing is charged yet. You fund the deal into escrow next, and the seller is paid only after you confirm delivery.
        </p>
      </div>
    </Card>
  )
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          PayPack secure checkout
        </div>
        <Suspense fallback={null}>
          <CheckoutContent />
        </Suspense>
      </div>
    </div>
  )
}
