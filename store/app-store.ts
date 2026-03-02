import { create } from "zustand"
import type { AppMode, Deal, ChatThread } from "@/types"

interface AppState {
  mode: AppMode
  setMode: (mode: AppMode) => void
  walletBalance: number
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
  selectedDealId: "1",
  setSelectedDealId: (id) => set({ selectedDealId: id }),
  activeChatId: "1",
  setActiveChatId: (id) => set({ activeChatId: id }),
  newDealModalOpen: false,
  setNewDealModalOpen: (open) => set({ newDealModalOpen: open }),
  newDealStep: 1,
  setNewDealStep: (step) => set({ newDealStep: step }),
}))

// Mock data
export const mockDeals: Deal[] = [
  {
    id: "1",
    title: "iPhone 16 Pro Max 256gb",
    description: "Brand new, sealed. Original box.",
    price: 1099,
    shippingPrice: 5,
    currency: "EUR",
    status: "pending",
    role: "buyer",
    counterparty: "Michael Chen",
    createdAt: "1 hour ago",
    updatedAt: "1 hour ago",
  },
  {
    id: "2",
    title: "MacBook Air M3",
    description: "Lightly used, perfect condition.",
    price: 899,
    shippingPrice: 12,
    currency: "EUR",
    status: "escrow",
    role: "buyer",
    counterparty: "Sarah Miller",
    createdAt: "2 days ago",
    updatedAt: "2 days ago",
  },
  {
    id: "3",
    title: "Sony WH-1000XM5",
    description: "Used for 2 months. Comes with case.",
    price: 250,
    shippingPrice: 8,
    currency: "EUR",
    status: "completed",
    role: "seller",
    counterparty: "Alex Johnson",
    createdAt: "1 week ago",
    updatedAt: "1 week ago",
  },
  {
    id: "4",
    title: "iPad Pro 12.9 M2",
    description: "Like new, Apple Pencil included.",
    price: 750,
    shippingPrice: 10,
    currency: "EUR",
    status: "completed",
    role: "seller",
    counterparty: "Emma Davis",
    createdAt: "1 week ago",
    updatedAt: "1 week ago",
  },
  {
    id: "5",
    title: "Nintendo Switch OLED",
    description: "White model, extra controllers.",
    price: 280,
    shippingPrice: 6,
    currency: "EUR",
    status: "escrow",
    role: "buyer",
    counterparty: "David Kim",
    createdAt: "2 weeks ago",
    updatedAt: "2 weeks ago",
  },
  {
    id: "6",
    title: "Canon EOS R6 Mark II",
    description: "Body only, mint condition.",
    price: 1800,
    shippingPrice: 15,
    currency: "EUR",
    status: "pending",
    role: "seller",
    counterparty: "Lisa Wong",
    createdAt: "2 weeks ago",
    updatedAt: "2 weeks ago",
  },
]

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
