"use client"

import { Bell, Compass, Menu } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { usePathname, useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn, formatDealRelativeTime } from "@/lib/utils"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import Link from "next/link"

const notificationDotClass: Record<string, string> = {
  deal: "bg-success",
  shipment: "bg-primary",
  security: "bg-warning",
  wallet: "bg-success",
  chat: "bg-primary",
}

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  // Derived from the URL rather than the stored mode, so the blue "ship" header can't stick around
  // after navigating from Shipments to any other page.
  const isShipSection = pathname.startsWith("/dashboard/shipments")
  const { user, notifications, markNotificationRead, setTourPendingStart } = useAppStore()
  const unreadNotifications = notifications.filter((n) => !n.readAt).length
  const recentNotifications = notifications.slice(0, 5)

  function openNotification(id: string, href: string | null) {
    markNotificationRead(id).catch(() => {})
    if (href) router.push(href)
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?"

  return (
    <header
      className={cn(
        "flex items-center justify-between border-b px-4 py-3 transition-colors sm:px-6 md:px-8",
        isShipSection
          ? "border-[#4C7A99] bg-[#5E90B4] text-primary-foreground"
          : "border-primary bg-primary text-primary-foreground",
      )}
    >
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-inherit transition-colors hover:opacity-90 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b border-border bg-sidebar px-6 py-4 text-left">
              <SheetTitle className="text-sm font-semibold text-sidebar-foreground">
                <SheetClose asChild>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-0.5 hover:opacity-90"
                  >
                    PayPack<span className="font-light text-primary">.uno</span>
                  </Link>
                </SheetClose>
              </SheetTitle>
            </SheetHeader>
            <nav className="space-y-1 px-3 py-4 text-sm">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/dashboard/deals", label: "Deals" },
                { href: "/dashboard/shipments", label: "Shipments" },
                { href: "/dashboard/chats", label: "Chats" },
                { href: "/dashboard/users", label: "Find users" },
                { href: "/dashboard/support", label: "Support" },
                { href: "/dashboard/notifications", label: "Notifications" },
                { href: "/dashboard/wallet", label: "Wallet" },
                { href: "/dashboard/profile", label: "Profile" },
                { href: "/dashboard/settings", label: "Settings" },
                { href: "/admin", label: "Admin" },
              ].map((item) => (
                <SheetClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-xl px-4 py-3 font-medium transition-colors",
                      "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Guided tour */}
        <button
          type="button"
          onClick={() => {
            setTourPendingStart(true)
            router.push("/dashboard")
          }}
          className="hidden items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-2.5 py-1.5 text-xs font-medium text-inherit transition-colors hover:bg-white/25 sm:flex"
          title="Take a guided tour"
        >
          <Compass className="h-4 w-4" />
          Take a tour
        </button>

        {/* Notifications */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="relative text-inherit opacity-80 transition-opacity hover:opacity-100">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {unreadNotifications}
                </span>
              ) : null}
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center justify-between pr-6 text-base">
                <span>Notifications</span>
                <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
                  {unreadNotifications} unread
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Latest activity across your deals and shipments.
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-2" />
            <ScrollArea className="max-h-64 pr-2">
              {recentNotifications.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {recentNotifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n.id, n.relatedHref)}
                      className="flex w-full gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-secondary/50"
                    >
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          n.readAt ? "bg-muted-foreground/30" : notificationDotClass[n.type],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-foreground">{n.title}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDealRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        {n.description ? (
                          <p className="truncate text-xs text-muted-foreground">{n.description}</p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Link
                href="/dashboard/notifications/"
                className="mt-2 block text-center text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Profile — desktop already shows it at the top of the sidebar */}
        <Link href="/dashboard/profile" aria-label="Open profile" className="md:hidden">
          <span className="flex items-center gap-3 rounded-full border border-transparent px-1 py-1 text-inherit transition-colors hover:opacity-90">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-white/20 text-inherit text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden flex-col text-left text-xs sm:flex [color:inherit]">
              <span className="font-semibold">
                {user?.name ?? "..."}
              </span>
              <span className="text-[10px] opacity-80">
                {user?.email ?? ""}
              </span>
            </span>
          </span>
        </Link>
      </div>
    </header>
  )
}
