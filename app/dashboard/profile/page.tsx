"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { DashboardHeader } from "@/components/dashboard/header"
import { Camera, ShieldCheck, Trash2 } from "lucide-react"
import { profileUpdateSchema } from "@/lib/auth/schemas"
import { useAppStore } from "@/store/app-store"
import { cn } from "@/lib/utils"
import type { KycStatus } from "@/lib/kyc"

const kycBadgeClass: Record<KycStatus, string> = {
  unverified: "bg-secondary text-secondary-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
}

type FormValues = z.infer<typeof profileUpdateSchema>

interface MeResponse {
  id: string
  name: string
  email: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  role: string
}

export default function ProfilePage() {
  const setUser = useAppStore((s) => s.setUser)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [kycStatus, setKycStatus] = useState<KycStatus>("unverified")
  const [docUrl, setDocUrl] = useState("")
  const [submittingKyc, setSubmittingKyc] = useState(false)

  async function loadKyc() {
    const res = await fetch("/api/kyc/me")
    if (res.ok) {
      const data = await res.json()
      setKycStatus(data.status)
    }
  }

  async function submitKyc() {
    setSubmittingKyc(true)
    try {
      const documents = docUrl.trim() ? [{ docType: "id", fileUrl: docUrl.trim() }] : []
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      })
      if (res.ok) {
        setDocUrl("")
        await loadKyc()
      }
    } finally {
      setSubmittingKyc(false)
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(profileUpdateSchema) })

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? (res.json() as Promise<MeResponse>) : null))
      .then((me) => {
        if (!me) return
        setEmail(me.email)
        reset({ name: me.name, phone: me.phone ?? "", bio: me.bio ?? "" })
      })
      .finally(() => setLoading(false))
    loadKyc()
  }, [reset])

  async function onSubmit(values: FormValues) {
    setSaved(false)
    const res = await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      const updated = await res.json()
      setUser(updated)
      setSaved(true)
    }
  }

  const name = watch("name") ?? ""
  const initials = name
    ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto w-full max-w-lg space-y-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Personal Information
          </h3>

          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground">
                {initials}
              </div>
              <button
                type="button"
                disabled
                title="Avatar uploads are not available yet"
                className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div>
              <p className="font-medium text-foreground">{loading ? "Loading..." : name || "—"}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-xl border border-border bg-card p-6"
          >
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Full name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                {...register("name")}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Phone</label>
              <input
                type="tel"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                {...register("phone")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Bio</label>
              <textarea
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                {...register("bio")}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </button>
          </form>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Verification
                </h4>
              </div>
              <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold uppercase", kycBadgeClass[kycStatus])}>
                {kycStatus}
              </span>
            </div>
            {kycStatus === "approved" ? (
              <p className="text-xs text-muted-foreground">Your account is verified.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {kycStatus === "pending"
                    ? "Your verification is in review."
                    : "Submit a link to a supporting document (optional) and request verification."}
                </p>
                <input
                  type="url"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="Link to ID document (optional)"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={submitKyc}
                  disabled={submittingKyc}
                  className="w-full rounded-lg border border-primary/30 bg-primary/10 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
                >
                  {submittingKyc ? "Submitting..." : "Request verification"}
                </button>
              </>
            )}
          </div>

          <div className="rounded-xl border border-destructive/30 bg-card p-4">
            <h4 className="mb-2 text-xs font-medium text-destructive">Danger Zone</h4>
            <button
              type="button"
              disabled
              title="Not available yet"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-destructive opacity-50 transition-all"
            >
              <Trash2 className="h-3 w-3" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
