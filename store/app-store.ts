import { create } from "zustand"
import type { AppMode, Deal } from "@/types"
import type { WalletSummary } from "@/lib/wallet"
import type { ChatThreadSummaryDTO } from "@/lib/chat"
import type { NotificationDTO } from "@/lib/notifications"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AppState {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  mode: AppMode
  setMode: (mode: AppMode) => void
  wallet: WalletSummary | null
  setWallet: (wallet: WalletSummary | null) => void
  refreshWallet: () => Promise<void>
  deals: Deal[]
  setDeals: (deals: Deal[]) => void
  addDeal: (deal: Deal) => void
  updateDeal: (deal: Deal) => void
  selectedDealId: string | null
  setSelectedDealId: (id: string | null) => void
  chatThreads: ChatThreadSummaryDTO[]
  refreshChats: () => Promise<void>
  notifications: NotificationDTO[]
  refreshNotifications: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  newDealModalOpen: boolean
  setNewDealModalOpen: (open: boolean) => void
  newDealStep: number
  setNewDealStep: (step: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  mode: "deal",
  setMode: (mode) => set({ mode }),
  wallet: null,
  setWallet: (wallet) => set({ wallet }),
  refreshWallet: async () => {
    const res = await fetch("/api/wallet")
    set({ wallet: res.ok ? await res.json() : null })
  },
  deals: [],
  setDeals: (deals) =>
    set((state) => {
      const nextSelected =
        state.selectedDealId && deals.some((d) => d.id === state.selectedDealId)
          ? state.selectedDealId
          : deals[0]?.id ?? null
      return { deals, selectedDealId: nextSelected }
    }),
  addDeal: (deal) =>
    set((state) => ({
      deals: [deal, ...state.deals],
      selectedDealId: deal.id,
    })),
  updateDeal: (deal) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === deal.id ? deal : d)),
    })),
  selectedDealId: null,
  setSelectedDealId: (id) => set({ selectedDealId: id }),
  chatThreads: [],
  refreshChats: async () => {
    const res = await fetch("/api/chats")
    set({ chatThreads: res.ok ? await res.json() : [] })
  },
  notifications: [],
  refreshNotifications: async () => {
    const res = await fetch("/api/notifications")
    set({ notifications: res.ok ? await res.json() : [] })
  },
  markNotificationRead: async (id) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" })
    if (res.ok) {
      const updated = await res.json()
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
      }))
    }
  },
  markAllNotificationsRead: async () => {
    const res = await fetch("/api/notifications/read-all", { method: "POST" })
    if (res.ok) {
      set((state) => ({
        notifications: state.notifications.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
      }))
    }
  },
  newDealModalOpen: false,
  setNewDealModalOpen: (open) => set({ newDealModalOpen: open }),
  newDealStep: 1,
  setNewDealStep: (step) => set({ newDealStep: step }),
}))
