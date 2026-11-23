"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeftRight, ArrowUpRight, Handshake, Package, type LucideIcon } from "lucide-react"
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

const tileBase =
  "group relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
const tileIdle = "text-sidebar-muted hover:bg-sidebar/70 hover:text-sidebar-foreground"

function TileContent({ icon: Icon, label, iconClass }: { icon: LucideIcon; label: string; iconClass?: string }) {
  return (
    <>
      <Icon className={cn("h-5 w-5 transition-transform group-hover:-translate-y-0.5", iconClass)} />
      <span className="truncate">{label}</span>
    </>
  )
}

/** Deal / Shipment / Transfer — the three things PayPack does, always one click away. */
export function SectionSwitcher({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname()
  const storedMode = useAppStore((s) => s.mode)
  const mode = sectionForPath(pathname) ?? storedMode

  return (
    <nav aria-label="Sections" className={cn("flex gap-1 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-1", className)}>
      <Link
        href={SECTION_HOME.deal}
        onClick={onNavigate}
        aria-current={mode === "deal" ? "page" : undefined}
        className={cn(tileBase, mode === "deal" ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : tileIdle)}
      >
        <TileContent icon={Handshake} label="Deal" iconClass={mode === "deal" ? undefined : "text-primary"} />
      </Link>
      <Link
        href={SECTION_HOME.ship}
        onClick={onNavigate}
        aria-current={mode === "ship" ? "page" : undefined}
        className={cn(tileBase, mode === "ship" ? "bg-ship text-ship-foreground shadow-md shadow-ship/30" : tileIdle)}
      >
        <TileContent icon={Package} label="Shipment" iconClass={mode === "ship" ? undefined : "text-ship"} />
      </Link>
      <a
        href="https://awallet.tech"
        target="_blank"
        rel="noreferrer"
        onClick={onNavigate}
        title="Money transfer via aWallet (opens in a new tab)"
        className={cn(tileBase, tileIdle)}
      >
        <ArrowUpRight className="absolute right-1.5 top-1.5 h-3 w-3 opacity-50" />
        <TileContent icon={ArrowLeftRight} label="Transfer" iconClass="text-[#1b74e4]" />
      </a>
    </nav>
  )
}
