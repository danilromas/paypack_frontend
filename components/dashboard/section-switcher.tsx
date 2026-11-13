"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeftRight, ExternalLink, Handshake, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/app-store"
import type { AppMode } from "@/types"

export const SECTION_HOME: Record<AppMode, string> = {
  deal: "/dashboard",
  ship: "/dashboard/shipments",
}

/** The section a page belongs to, or null for shared pages (chats, wallet…) that keep the current one. */
export function sectionForPath(pathname: string): AppMode | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/deals")) return "deal"
  if (pathname.startsWith("/dashboard/shipments")) return "ship"
  return null
}

/** Whether a menu link points at the page being viewed. "Dashboard" follows the current section. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/deals")
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Deal / Shipment / Transfer — the three things PayPack does, always one click away. */
export function SectionSwitcher({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname()
  const storedMode = useAppStore((s) => s.mode)
  const mode = sectionForPath(pathname) ?? storedMode

  const base =
    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors"
  const idle = "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"

  return (
    <div className={cn("flex gap-1 rounded-2xl bg-sidebar-accent/40 p-1", className)}>
      <Link
        href={SECTION_HOME.deal}
        onClick={onNavigate}
        aria-current={mode === "deal" ? "page" : undefined}
        className={cn(base, mode === "deal" ? "bg-primary text-primary-foreground shadow-sm" : idle)}
      >
        <Handshake className="h-4 w-4" />
        Deal
      </Link>
      <Link
        href={SECTION_HOME.ship}
        onClick={onNavigate}
        aria-current={mode === "ship" ? "page" : undefined}
        className={cn(base, mode === "ship" ? "bg-ship text-ship-foreground shadow-sm" : idle)}
      >
        <Package className="h-4 w-4" />
        Shipment
      </Link>
      <a
        href="https://awallet.tech"
        target="_blank"
        rel="noreferrer"
        onClick={onNavigate}
        title="Money transfer via aWallet (opens in a new tab)"
        className={cn(base, idle)}
      >
        <span className="flex items-center gap-0.5">
          <ArrowLeftRight className="h-4 w-4" />
          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
        </span>
        Transfer
      </a>
    </div>
  )
}
