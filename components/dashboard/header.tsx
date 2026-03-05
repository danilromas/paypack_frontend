"use client"

import { useState } from "react"
import { Bell, Plus, Wallet, Package } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

export function DashboardHeader() {
  const router = useRouter()
  const { mode, walletBalance } = useAppStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
        <div className="flex items-center gap-3">
          {mode === "ship" ? (
            <Button
              onClick={() => {
                router.push("/dashboard/shipments?mode=ship&new=1")
              }}
              className="gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              NEW SHIPMENT
              <Package className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <span className="text-lg font-semibold text-foreground">
              Dashboard
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button
            className="relative text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              1
            </span>
          </button>
          <button
            className="flex items-center gap-3 rounded-full px-1 py-1 transition-colors hover:bg-secondary/60"
            onClick={() => setProfileOpen(true)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-bold text-primary-foreground">
              JD
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              {walletBalance}$
            </div>
          </button>
        </div>
      </header>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>
              Quick overview of your latest activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <p className="font-medium text-foreground">
                Deal #44317541 moved to Escrow
              </p>
              <p className="text-xs text-muted-foreground">2 minutes ago</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <p className="font-medium text-foreground">
                Shipment #PP-1023 is now In Transit
              </p>
              <p className="text-xs text-muted-foreground">1 hour ago</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Mark all as read
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>
              Account overview and quick actions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-lg font-bold text-primary-foreground">
              JD
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                John Doe
              </p>
              <p className="text-xs text-muted-foreground">
                john.doe@example.com
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <button className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary">
              <span>Wallet balance</span>
              <span className="font-semibold">{walletBalance}$</span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary">
              <span>Account settings</span>
              <span className="text-xs text-muted-foreground">Coming soon</span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary">
              <span>Support</span>
              <span className="text-xs text-muted-foreground">Open chat</span>
            </button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
