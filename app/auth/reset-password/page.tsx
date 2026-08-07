"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { Shield, Lock } from "lucide-react"
import { resetPasswordSchema } from "@/lib/auth/schemas"

type FormValues = { password: string; confirmPassword: string }
type ApiValues = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    setServerError(null)
    if (values.password !== values.confirmPassword) {
      setServerError("Passwords don't match")
      return
    }
    const parsed = resetPasswordSchema.safeParse({ token, password: values.password } satisfies ApiValues)
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Invalid password")
      return
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setServerError(data.error ?? "Failed to reset password")
      return
    }
    setDone(true)
    setTimeout(() => router.push("/auth"), 2000)
  }

  if (!token) {
    return (
      <p className="rounded-xl border border-border bg-secondary p-4 text-sm text-foreground">
        This reset link is missing a token. Request a new one from the{" "}
        <Link href="/auth" className="text-primary hover:underline">
          log in page
        </Link>
        .
      </p>
    )
  }

  if (done) {
    return (
      <p className="rounded-xl border border-border bg-secondary p-4 text-sm text-foreground">
        Password updated. Redirecting to log in...
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">New password</span>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...register("password", { required: true, minLength: 8 })}
          />
        </div>
        {errors.password && <span className="mt-1 block text-xs text-destructive">At least 8 characters</span>}
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Confirm password</span>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...register("confirmPassword", { required: true })}
          />
        </div>
      </label>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Please wait..." : "Set new password"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
            P
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            PayPack<span className="font-light text-primary">.uno</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto grid max-w-7xl place-items-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Set a new password</h2>
              <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
            </div>
          </div>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
