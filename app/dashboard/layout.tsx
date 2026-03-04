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
    <div className={cn("flex min-h-screen", isShipments ? "bg-[#f0e5d8]" : "bg-[#f5ede4]")}>
      <DashboardSidebar />
      <main
        className={cn(
          "ml-64 flex flex-1 flex-col overflow-hidden border-l border-border",
          isShipments ? "bg-[#fff7ec]" : "bg-[#fffdf8]"
        )}
      >
        {children}
      </main>
    </div>
  )
}
