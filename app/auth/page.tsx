import { AuthPanel } from "@/components/auth/auth-panel"
import Link from "next/link"

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
            P
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            PayPack<span className="font-light text-primary">.uno</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto grid max-w-7xl place-items-center px-6 py-10 lg:px-8">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
          <AuthPanel />
        </div>
      </main>
    </div>
  )
}

