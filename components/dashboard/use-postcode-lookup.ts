"use client"

import { useEffect, useState } from "react"
import type { PostcodeLookup } from "@/lib/postcode-places"
import { postcodeError } from "@/lib/shipments"

const DEBOUNCE_MS = 350
// Shared across every field and wizard opening in this tab: the same postcode is asked for on the
// price step and again on the details step.
const memo = new Map<string, PostcodeLookup>()

/** Looks a postcode up once it is well-formed; null while typing, loading, or when not applicable. */
export function usePostcodeLookup(country: string, zip: string): PostcodeLookup | null {
  const c = country.trim().toUpperCase()
  const z = zip.trim()
  const key = `${c}:${z.toUpperCase()}`
  const ready = c !== "" && z !== "" && postcodeError(c, z) === null
  const [result, setResult] = useState<{ key: string; value: PostcodeLookup } | null>(() =>
    ready && memo.has(key) ? { key, value: memo.get(key)! } : null,
  )

  useEffect(() => {
    if (!ready) return
    const cached = memo.get(key)
    if (cached) {
      setResult({ key, value: cached })
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/shipments/postcode/?${new URLSearchParams({ country: c, zip: z })}`, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<PostcodeLookup>) : null))
        .then((value) => {
          if (!value) return
          if (value.status !== "unchecked") memo.set(key, value)
          setResult({ key, value })
        })
        .catch(() => {})
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [ready, key, c, z])

  return ready && result?.key === key ? result.value : null
}
