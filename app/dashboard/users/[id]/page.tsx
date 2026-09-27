"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Lock, ShieldCheck, Star } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { cn } from "@/lib/utils"
import type { KycStatus } from "@/lib/kyc"

const kycBadgeClass: Record<KycStatus, string> = {
  unverified: "bg-secondary text-secondary-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
}

interface RecentReview {
  raterName: string
  score: number
  comment: string | null
  createdAt: string
}

interface PublicProfile {
  id: string
  name: string
  avatarUrl: string | null
  memberSince: string
  kycStatus: KycStatus
  completedDealsCount: number
  ratingAverage: number | null
  ratingCount: number
  recentReviews: RecentReview[]
}

function Stars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-4 w-4",
            n <= Math.round(score) ? "fill-warning text-warning" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  )
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/users/${params.id}/public`, { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Failed to load profile")
        if (!cancelled) setProfile(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load profile")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params.id])

  const initials = profile?.name
    ? profile.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto w-full max-w-lg space-y-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : profile ? (
            <>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
                <div>
                  <p className="font-medium text-foreground">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Member since{" "}
                    {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
                      new Date(profile.memberSince),
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <div className="mb-1 flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        kycBadgeClass[profile.kycStatus],
                      )}
                    >
                      {profile.kycStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">KYC status</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <div className="text-lg font-bold text-foreground">{profile.completedDealsCount}</div>
                  <p className="text-xs text-muted-foreground">Completed deals</p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rating
                  </h4>
                  {profile.ratingCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <Stars score={profile.ratingAverage ?? 0} />
                      <span className="text-xs text-muted-foreground">
                        {profile.ratingAverage?.toFixed(1)} ({profile.ratingCount})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No ratings yet</span>
                  )}
                </div>
                {profile.recentReviews.length > 0 && (
                  <div className="space-y-3 border-t border-border pt-3">
                    {profile.recentReviews.map((r, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{r.raterName}</span>
                          <Stars score={r.score} />
                        </div>
                        {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
