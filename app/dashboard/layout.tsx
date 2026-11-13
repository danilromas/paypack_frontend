"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import {
  NewDealModal,
  type DealImportPrefill,
} from "@/components/dashboard/new-deal-modal"
import { ProductTour } from "@/components/tour/product-tour"
import { sectionForPath } from "@/components/dashboard/section-switcher"
import { useAppStore } from "@/store/app-store"
import type { Deal } from "@/types"

function NewDealModalHost() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { newDealModalOpen, setNewDealModalOpen } = useAppStore()
  const [importPrefill, setImportPrefill] = useState<DealImportPrefill | undefined>(undefined)
  const importConsumed = useRef(false)

  useEffect(() => {
    if (searchParams.get("pp_import") !== "1") {
      importConsumed.current = false
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("pp_import") !== "1") return
    if (importConsumed.current) return
    importConsumed.current = true

    const priceRaw = searchParams.get("price")
    let price: number | undefined
    if (priceRaw) {
      const n = Number(priceRaw)
      if (Number.isFinite(n) && n > 0) price = Math.round(n)
    }

    const draft: DealImportPrefill = {
      productLink: searchParams.get("link") ?? "",
      title: searchParams.get("title") ?? "",
      price,
      itemDetailDesc: searchParams.get("desc") ?? "",
      imageUrl: searchParams.get("image") ?? "",
    }
    setImportPrefill(draft)
    setNewDealModalOpen(true)
    router.replace("/dashboard/deals", { scroll: false })
  }, [searchParams, router, setNewDealModalOpen])

  const prevModalOpen = useRef(false)
  useEffect(() => {
    if (prevModalOpen.current && !newDealModalOpen) {
      setImportPrefill(undefined)
    }
    prevModalOpen.current = newDealModalOpen
  }, [newDealModalOpen])

  if (!newDealModalOpen) return null
  return <NewDealModal importPrefill={importPrefill} />
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isShipments = pathname.startsWith("/dashboard/shipments")
  const setUser = useAppStore((s) => s.setUser)
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const modeRestored = useRef(false)

  // Deal and Shipment pages set the section; shared pages (chats, wallet…) keep the last one, so
  // "Dashboard" in the menu leads back to where you came from — also after a reload.
  useEffect(() => {
    const section = sectionForPath(pathname)
    if (section) {
      setMode(section)
    } else if (!modeRestored.current) {
      try {
        const saved = localStorage.getItem("pp-section")
        if (saved === "deal" || saved === "ship") setMode(saved)
      } catch {}
    }
    modeRestored.current = true
  }, [pathname, setMode])

  useEffect(() => {
    if (!modeRestored.current) return
    try {
      localStorage.setItem("pp-section", mode)
    } catch {}
  }, [mode])
  const setDeals = useAppStore((s) => s.setDeals)
  const setDealsError = useAppStore((s) => s.setDealsError)
  const refreshWallet = useAppStore((s) => s.refreshWallet)
  const refreshChats = useAppStore((s) => s.refreshChats)
  const refreshNotifications = useAppStore((s) => s.refreshNotifications)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => setUser(user))
      .catch(() => setUser(null))
    refreshWallet().catch(() => {})
    refreshChats().catch(() => {})
    refreshNotifications().catch(() => {})
    fetch("/api/deals", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load deals")
        return res.json() as Promise<Deal[]>
      })
      .then((deals) => {
        setDealsError(null)
        setDeals(deals)
      })
      .catch(() => setDealsError("Could not load deals."))

    // Keeps the unread badges in the sidebar/header roughly fresh while browsing
    // pages other than /dashboard/chats, which polls much faster on its own.
    const interval = setInterval(() => {
      refreshChats().catch(() => {})
      refreshNotifications().catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [setUser, setDeals, setDealsError, refreshWallet, refreshChats, refreshNotifications])

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col md:flex-row",
        isShipments ? "bg-[#f0e5d8]" : "bg-[#f5ede4]",
      )}
    >
      <div className="hidden md:block">
        <DashboardSidebar />
      </div>
      <main
        className={cn(
          "flex flex-1 flex-col overflow-hidden border-border md:ml-64 md:border-l",
          isShipments ? "bg-[#fff7ec]" : "bg-[#fffdf8]",
        )}
      >
        {children}
      </main>
      <Suspense fallback={null}>
        <NewDealModalHost />
      </Suspense>
      <ProductTour />
    </div>
  )
}
