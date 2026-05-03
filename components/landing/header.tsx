"use client"

import Link from "next/link"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AuthPanel } from "@/components/auth/auth-panel"
import Image from "next/image"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
  { href: "/extension/", label: "Extension" },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<"login" | "signup">("login")

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="PayPack logo"
            width={40}
            height={40}
            className="h-9 w-9 sm:h-10 sm:w-10"
            priority
          />
          <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            PayPack
            <span className="font-light text-primary">.uno</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-foreground md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="border-b border-border px-4 py-4">
              <SheetTitle className="text-left text-sm font-semibold">
                Menu
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-0 py-2">
              {navLinks.map((link) => (
                <SheetClose key={link.href} asChild>
                  <a
                    href={link.href}
                    className="block px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    {link.label}
                  </a>
                </SheetClose>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-border px-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setDefaultTab("login")
                    setOpen(true)
                    setMenuOpen(false)
                  }}
                  className="w-full rounded-lg border border-border py-2.5 text-sm font-medium"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDefaultTab("signup")
                    setOpen(true)
                    setMenuOpen(false)
                  }}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground"
                >
                  Sign up
                </button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="hidden items-center gap-3 md:flex">
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
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 sm:px-4 sm:py-2"
          >
            Sign up
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-3xl p-4 sm:p-6">
          <AuthPanel defaultTab={defaultTab} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  )
}
