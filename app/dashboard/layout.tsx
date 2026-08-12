"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { useAppStore } from "@/store/app-store"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isShipments = pathname.startsWith("/dashboard/shipments")
  const setUser = useAppStore((s) => s.setUser)
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

    // Keeps the unread badges in the sidebar/header roughly fresh while browsing
    // pages other than /dashboard/chats, which polls much faster on its own.
    const interval = setInterval(() => {
      refreshChats().catch(() => {})
      refreshNotifications().catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [setUser, refreshWallet, refreshChats, refreshNotifications])

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
    </div>
  )
}
