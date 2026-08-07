import { create } from "zustand"
import type { AppMode, Deal, ChatThread } from "@/types"
import type { WalletSummary } from "@/lib/wallet"

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
  activeChatId: string | null
  setActiveChatId: (id: string | null) => void
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
  activeChatId: "1",
  setActiveChatId: (id) => set({ activeChatId: id }),
  newDealModalOpen: false,
  setNewDealModalOpen: (open) => set({ newDealModalOpen: open }),
  newDealStep: 1,
  setNewDealStep: (step) => set({ newDealStep: step }),
}))

export const mockChats: ChatThread[] = [
  {
    id: "1",
    name: "Michael",
    lastMessage: "Ok, I'll ship it...",
    lastMessageTime: "2m",
    unreadCount: 2,
    online: true,
    dealId: "1",
  },
  {
    id: "2",
    name: "Sarah",
    lastMessage: "Deal confirmed!",
    lastMessageTime: "Now",
    unreadCount: 0,
    online: true,
    dealId: "2",
  },
  {
    id: "3",
    name: "Alex",
    lastMessage: "More photos?",
    lastMessageTime: "1h",
    unreadCount: 0,
    online: false,
    dealId: "3",
  },
  {
    id: "4",
    name: "Emma",
    lastMessage: "Thanks!",
    lastMessageTime: "2d",
    unreadCount: 0,
    online: false,
    dealId: "4",
  },
]
