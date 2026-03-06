"use client"

import Link from "next/link"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AuthPanel } from "@/components/auth/auth-panel"
import Image from "next/image"

export function LandingHeader() {
  const [open, setOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<"login" | "signup">("login")

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="PayPack logo"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            PayPack
            <span className="font-light text-primary">.uno</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#about"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#security"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Security
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setDefaultTab("login")
              setOpen(true)
            }}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setDefaultTab("signup")
              setOpen(true)
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90"
          >
            Sign up
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <AuthPanel defaultTab={defaultTab} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  )
}
