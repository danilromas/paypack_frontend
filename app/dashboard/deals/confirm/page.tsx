"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { CheckCircle2, QrCode, AlertTriangle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Deal } from "@/types"

type ParsedPayload = {
  type?: string
  dealId?: string
  role?: string
  ts?: number
}

function DealConfirmPageContent() {
  const params = useSearchParams()
  const payloadFromUrl = params.get("payload") ?? ""
  const [manualPayload, setManualPayload] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const activePayload = manualPayload.trim() || payloadFromUrl

  const parsed = useMemo(() => {
    if (!activePayload) return null
    try {
      return JSON.parse(activePayload) as ParsedPayload
    } catch {
      return null
    }
  }, [activePayload])

  function handleConfirm() {
    if (!parsed || parsed.type !== "deal-confirm" || !parsed.dealId) {
      setConfirmed(false)
      setError("Payload is invalid")
      setStatusMessage(null)
      return
    }
    setError(null)
    setConfirmed(true)
    setStatusMessage(null)
  }

  async function handleConfirmOnPayPack() {
    if (!parsed || parsed.type !== "deal-confirm" || !parsed.dealId) {
      setError("Invalid payload, cannot confirm")
      setConfirmed(false)
      return
    }
    setSubmitting(true)
    setError(null)
    setStatusMessage(null)

    try {
      const getRes = await fetch(`/api/deals/${parsed.dealId}`, {
        cache: "no-store",
      })
      if (!getRes.ok) {
        throw new Error("Deal not found")
      }
      const deal = (await getRes.json()) as Deal

      if (deal.status !== "pending") {
        setConfirmed(true)
        setStatusMessage(`Deal already ${deal.status}. No update needed.`)
        return
      }

      const putRes = await fetch(`/api/deals/${parsed.dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: deal.title,
          description: deal.description,
          price: deal.price,
          shippingPrice: deal.shippingPrice,
          currency: deal.currency,
          status: "escrow",
          role: deal.role,
          counterparty: deal.counterparty,
          counterpartyAvatar: deal.counterpartyAvatar ?? null,
        }),
      })
      if (!putRes.ok) {
        const body = (await putRes.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(body?.error ?? "Failed to confirm on PayPack")
      }

      setConfirmed(true)
      setStatusMessage("Confirmed. Deal status changed from pending to escrow.")
    } catch (e) {
      setConfirmed(false)
      setError(e instanceof Error ? e.message : "Confirmation failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Deal Scan Confirmation
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirm that the seller is sharing a valid deal QR payload.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <QrCode className="h-4 w-4 text-primary" />
              Scan input
            </div>
            <textarea
              value={manualPayload}
              onChange={(e) => {
                setManualPayload(e.target.value)
                setConfirmed(false)
                setError(null)
              }}
              placeholder="Paste scanned payload (or open this page with ?payload=...)"
              className="h-28 w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleConfirm}
              className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              Validate scanned payload
            </button>
            <button
              onClick={handleConfirmOnPayPack}
              disabled={submitting}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#5E90B4] px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "I confirm this is my item on PayPack"
              )}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-foreground">Result</div>
            {!activePayload ? (
              <p className="text-sm text-muted-foreground">
                No payload provided yet.
              </p>
            ) : parsed ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{parsed.type ?? "unknown"}</Badge>
                  {parsed.dealId ? (
                    <Badge variant="outline">Deal: {parsed.dealId}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground">Role: {parsed.role ?? "—"}</p>
                <p className="text-muted-foreground">
                  Timestamp: {parsed.ts ? new Date(parsed.ts).toLocaleString() : "—"}
                </p>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Invalid JSON payload
              </div>
            )}

            {confirmed && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Deal confirmation successful.
              </div>
            )}
            {statusMessage && (
              <div className="mt-3 text-sm font-medium text-primary">
                {statusMessage}
              </div>
            )}
            {error && (
              <div className="mt-4 text-sm font-medium text-destructive">{error}</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function DealConfirmPage() {
  return (
    <Suspense fallback={null}>
      <DealConfirmPageContent />
    </Suspense>
  )
}

