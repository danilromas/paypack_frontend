"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { Camera, Trash2 } from "lucide-react"

export default function ProfilePage() {
  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto w-full max-w-lg space-y-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Personal Information
          </h3>

          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground">
                JD
              </div>
              <button className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div>
              <p className="font-medium text-foreground">John Doe</p>
              <p className="text-xs text-muted-foreground">@johndoe</p>
              <p className="mt-1 text-[10px] text-primary">Member since 2023</p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">First Name</label>
                <input type="text" defaultValue="John" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Last Name</label>
                <input type="text" defaultValue="Doe" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Email</label>
              <input type="email" defaultValue="john.doe@email.com" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Phone</label>
              <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Bio</label>
              <textarea rows={2} defaultValue="Trusted trader | Fast shipping" className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
              Save Changes
            </button>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-card p-4">
            <h4 className="mb-2 text-xs font-medium text-destructive">Danger Zone</h4>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-destructive transition-all hover:bg-destructive/10">
              <Trash2 className="h-3 w-3" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
