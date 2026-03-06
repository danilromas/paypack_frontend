"use client"

import { Bell, Plus, Wallet, Package, User } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
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

export function DashboardHeader() {
  const router = useRouter()
  const { mode, walletBalance } = useAppStore()

  return (
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
        {/* Notifications */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="relative text-muted-foreground transition-colors hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                3
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center justify-between text-base">
                <span>Notifications</span>
                <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
                  3 unread
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Latest activity across your deals and shipments.
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-2" />
            <ScrollArea className="max-h-64 pr-2">
              <div className="space-y-2 text-sm">
                <div className="flex gap-3 rounded-xl border border-border bg-card px-3 py-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-success" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        Funds locked for deal #25311491
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        2 min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      iPhone 16 Pro Max • Escrow started
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-border bg-card px-3 py-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        New shipment created
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        10 min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tracking ID PP-EXP-4421
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-border bg-card px-3 py-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-warning" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        Counterparty confirmed receipt
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        1 h
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nintendo Switch OLED • Funds ready to release
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Wallet */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-secondary/80">
              <Wallet className="h-4 w-4 text-primary" />
              <span>{walletBalance}$</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center justify-between text-base">
                <span>Wallet</span>
                <Badge variant="outline" className="text-[10px]">
                  Escrow wallet
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage your PayPack Uno balance.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl bg-secondary px-4 py-3">
                  <div className="text-xs text-muted-foreground">
                    Available balance
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {walletBalance}$
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Ready to withdraw or use for new deals.
                  </div>
                </div>
                <div className="w-px bg-border" />
                <div className="flex flex-col justify-between rounded-2xl bg-card px-3 py-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">In escrow</div>
                    <div className="text-sm font-semibold text-foreground">
                      2 050€
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pending payout</div>
                    <div className="text-sm font-semibold text-success">
                      540€
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button size="lg" className="w-full">
                  Top up
                </Button>
                <Button size="lg" variant="outline" className="w-full">
                  Withdraw
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Recent transactions</span>
                  <button className="text-[10px] font-normal text-primary hover:underline">
                    View all
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Escrow hold • Deal #25311491</span>
                    <span className="font-medium text-destructive">-1099€</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Today, 14:22</span>
                    <span>Pending</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between">
                    <span>Payout • Deal #88732014</span>
                    <span className="font-medium text-success">+320€</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Yesterday, 18:03</span>
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center gap-3 rounded-full border border-transparent px-1 py-1 transition-colors hover:border-border">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col text-left text-xs sm:flex">
                <span className="font-semibold text-foreground">
                  John Doe
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Premium user
                </span>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base">Profile</DialogTitle>
              <DialogDescription className="text-xs">
                Account details and security settings.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-base font-bold text-primary-foreground">
                    JD
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-foreground">
                      John Doe
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Premium
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    john.doe@example.com
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Verification</span>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    KYC Passed
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">2FA</span>
                  <span className="text-xs text-foreground">Enabled</span>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-4">
                <Button className="w-full" variant="outline">
                  View settings
                </Button>
                <Button className="w-full" variant="destructive">
                  Logout
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  )
}
