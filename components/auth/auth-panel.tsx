"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Shield, Mail, Lock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AuthTab = "login" | "signup"

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
  const [tab, setTab] = useState<AuthTab>(defaultTab)
  const [loading, setLoading] = useState(false)

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      // Placeholder auth flow: route user into the app.
      // When backend is ready, replace with real API + session handling.
      await new Promise((r) => setTimeout(r, 500))
      onSuccess?.()
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as AuthTab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Log in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field icon={Mail} label="Email" type="email" placeholder="you@email.com" />
            <Field icon={Lock} label="Password" type="password" placeholder="••••••••" />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Please wait..." : copy.submit}
            </button>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Forgot password?</span>
              <Link href="/auth" className="text-primary hover:underline">
                Reset
              </Link>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="mt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field icon={User} label="Name" type="text" placeholder="John Doe" />
            <Field icon={Mail} label="Email" type="email" placeholder="you@email.com" />
            <Field icon={Lock} label="Password" type="password" placeholder="••••••••" />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Please wait..." : copy.submit}
            </button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">{copy.footer}</span>
        <button
          type="button"
          onClick={() => setTab(copy.footerTo)}
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
}: {
  icon: typeof Mail
  label: string
  type: string
  placeholder: string
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
        />
      </div>
    </label>
  )
}

