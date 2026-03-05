"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "@/components/dashboard/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isShipments = pathname.startsWith("/dashboard/shipments")

  return (
    <div className={cn("flex min-h-screen bg-background", isShipments && "shipments-theme")}>
      <DashboardSidebar />
      <main
        className={cn(
          "ml-64 flex flex-1 flex-col overflow-hidden border-l border-border bg-background"
        )}
      >
        {children}
      </main>
    </div>
  )
}
