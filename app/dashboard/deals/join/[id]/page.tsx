"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Handshake, AlertTriangle } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAppStore } from "@/store/app-store"
import type { Deal } from "@/types"

interface InvitePreview {
  id: string
  title: string
  price: string | number
  currency: string
  role: "buyer" | "seller"
  status: string
  creatorName: string
  isOwnDeal: boolean
}

export default function JoinDealPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const addDeal = useAppStore((s) => s.addDeal)
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/deals/${params.id}/preview`, { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Invite not found")
        if (!cancelled) setPreview(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Invite not found")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params.id])

  async function handleJoin() {
    setJoining(true)
    setError(null)
    try {
      const res = await fetch(`/api/deals/${params.id}/join`, { method: "POST" })
      const data = (await res.json().catch(() => ({}))) as Deal & { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Failed to join deal")
      addDeal(data)
      router.push("/dashboard/deals")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join deal")
      setJoining(false)
    }
  }

  const counterpartyRole = preview ? (preview.role === "buyer" ? "seller" : "buyer") : null

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <Handshake className="h-7 w-7" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading invite...
              </div>
            ) : preview?.isOwnDeal ? (
              <>
                <h1 className="text-lg font-semibold text-foreground">This is your own deal</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Share this link with the other side instead — copy it again from the deal's detail page.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/deals")}
                  className="mt-6 w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                >
                  Go to your deals
                </button>
              </>
            ) : preview ? (
              <>
                <h1 className="text-xl font-bold text-foreground">You've been invited</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {preview.creatorName} started a deal for <strong className="text-foreground">{preview.title}</strong> and
                  wants you to join as the <strong className="capitalize text-foreground">{counterpartyRole}</strong>.
                </p>
                <div className="mt-6 rounded-2xl border border-border bg-secondary p-4 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Item</span>
                    <span className="font-medium text-foreground">{preview.title}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium text-foreground">
                      {preview.price} {preview.currency}
                    </span>
                  </div>
                </div>
                {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joining}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join this deal"
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-2 flex items-center justify-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h1 className="text-lg font-semibold text-foreground">This invite isn't valid</h1>
                <p className="mt-2 text-sm text-muted-foreground">{error ?? "It may have already been used, or the deal has moved on."}</p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="mt-6 w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                >
                  Go to dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
