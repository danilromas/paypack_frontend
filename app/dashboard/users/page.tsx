"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Search, Users } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { RatingStars } from "@/components/dashboard/rating-stars"

interface UserResult {
  id: string
  name: string
  ratingAverage: number | null
  ratingCount: number
  sharedDealsCount: number
}

export default function FindUsersPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" })
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(data.error ?? "Failed to search users")
        if (!cancelled) {
          setResults(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to search users")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
              <Users className="h-6 w-6 text-primary" />
              Find users
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Find any PayPack user to check their rating, reviews and KYC status before you trade.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {query.trim()
                ? "No one matches that name."
                : "Type at least 2 letters of a name to search all users. People you've traded with appear here."}
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/dashboard/users/${u.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
                      {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{u.name}</p>
                      <RatingStars score={u.ratingAverage} count={u.ratingCount} size="sm" />
                    </div>
                    {u.sharedDealsCount > 0 && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {u.sharedDealsCount} {u.sharedDealsCount === 1 ? "deal" : "deals"} together
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
