"use client"

import { useMemo, useState } from "react"
import { useForm, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, Mail, Lock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/store/app-store"
import { loginSchema, registerSchema, forgotPasswordSchema } from "@/lib/auth/schemas"

type AuthTab = "login" | "signup"
type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof registerSchema>
type ForgotValues = z.infer<typeof forgotPasswordSchema>

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error ?? "Something went wrong")
  }
  return data
}

export function AuthPanel({
  defaultTab = "login",
  onSuccess,
  className,
}: {
  defaultTab?: AuthTab
  onSuccess?: () => void
  className?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAppStore((s) => s.setUser)
  const [tab, setTab] = useState<AuthTab>(defaultTab)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const copy = useMemo(() => {
    if (tab === "signup") {
      return {
        title: "Create account",
        desc: "Sign up to start secure deals & shipments.",
        submit: "Create account",
        footer: "Already have an account?",
        footerCta: "Log in",
        footerTo: "login" as const,
      }
    }
    return {
      title: "Welcome back",
      desc: "Log in to continue to your dashboard.",
      submit: "Log in",
      footer: "New to PayPack.uno?",
      footerCta: "Sign up",
      footerTo: "signup" as const,
    }
  }, [tab])

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupValues>({ resolver: zodResolver(registerSchema) })
  const forgotForm = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) })

  function goToApp() {
    onSuccess?.()
    const redirect = searchParams.get("redirect")
    router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard")
  }

  async function onLogin(values: LoginValues) {
    setServerError(null)
    try {
      const user = await postJson("/api/auth/login", values)
      setUser(user)
      goToApp()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to log in")
    }
  }

  async function onSignup(values: SignupValues) {
    setServerError(null)
    try {
      const user = await postJson("/api/auth/register", values)
      setUser(user)
      goToApp()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to create account")
    }
  }

  async function onForgot(values: ForgotValues) {
    setServerError(null)
    try {
      await postJson("/api/auth/forgot-password", values)
      setForgotSent(true)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to send reset link")
    }
  }

  if (forgotMode) {
    return (
      <div className={cn("w-full", className)}>
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Reset password</h2>
            <p className="text-sm text-muted-foreground">We&apos;ll email you a reset link.</p>
          </div>
        </div>

        {forgotSent ? (
          <p className="rounded-xl border border-border bg-secondary p-4 text-sm text-foreground">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
            <Field
              icon={Mail}
              label="Email"
              type="email"
              placeholder="you@email.com"
              register={forgotForm.register("email")}
              error={forgotForm.formState.errors.email?.message}
            />
            {serverError && <p className="text-xs text-destructive">{serverError}</p>}
            <button
              type="submit"
              disabled={forgotForm.formState.isSubmitting}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {forgotForm.formState.isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setForgotMode(false)
              setForgotSent(false)
              setServerError(null)
            }}
            className="font-medium text-primary hover:underline"
          >
            Back to log in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.desc}</p>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as AuthTab)
          setServerError(null)
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Log in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-5">
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <Field
              icon={Mail}
              label="Email"
              type="email"
              placeholder="you@email.com"
              register={loginForm.register("email")}
              error={loginForm.formState.errors.email?.message}
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              placeholder="••••••••"
              register={loginForm.register("password")}
              error={loginForm.formState.errors.password?.message}
            />

            {serverError && <p className="text-xs text-destructive">{serverError}</p>}

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loginForm.formState.isSubmitting ? "Please wait..." : copy.submit}
            </button>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Forgot password?</span>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true)
                  setServerError(null)
                }}
                className="text-primary hover:underline"
              >
                Reset
              </button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="mt-5">
          <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
            <Field
              icon={User}
              label="Name"
              type="text"
              placeholder="John Doe"
              register={signupForm.register("name")}
              error={signupForm.formState.errors.name?.message}
            />
            <Field
              icon={Mail}
              label="Email"
              type="email"
              placeholder="you@email.com"
              register={signupForm.register("email")}
              error={signupForm.formState.errors.email?.message}
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              placeholder="••••••••"
              register={signupForm.register("password")}
              error={signupForm.formState.errors.password?.message}
            />

            {serverError && <p className="text-xs text-destructive">{serverError}</p>}

            <button
              type="submit"
              disabled={signupForm.formState.isSubmitting}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {signupForm.formState.isSubmitting ? "Please wait..." : copy.submit}
            </button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">{copy.footer}</span>
        <button
          type="button"
          onClick={() => {
            setTab(copy.footerTo)
            setServerError(null)
          }}
          className="font-medium text-primary hover:underline"
        >
          {copy.footerCta}
        </button>
      </div>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  type,
  placeholder,
  register,
  error,
}: {
  icon: typeof Mail
  label: string
  type: string
  placeholder: string
  register: UseFormRegisterReturn
  error?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...register}
        />
      </div>
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  )
}
