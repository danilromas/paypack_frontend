import { create } from "zustand"
import type { AppMode, Deal, ChatThread } from "@/types"

interface AppState {
  mode: AppMode
  setMode: (mode: AppMode) => void
  walletBalance: number
  deals: Deal[]
  setDeals: (deals: Deal[]) => void
  addDeal: (deal: Deal) => void
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
  mode: "deal",
  setMode: (mode) => set({ mode }),
  walletBalance: 500,
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
