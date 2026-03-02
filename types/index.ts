export type DealStatus = "pending" | "escrow" | "shipped" | "in-transit" | "delivered" | "completed" | "disputed" | "cancelled"

export interface Deal {
  id: string
  title: string
  description: string
  price: number
  shippingPrice: number
  currency: string
  status: DealStatus
  role: "buyer" | "seller"
  counterparty: string
  counterpartyAvatar?: string
  createdAt: string
  updatedAt: string
  images?: string[]
}

export type ShipmentStatus = "pending" | "in-transit" | "arrived" | "returned"

export interface Shipment {
  id: string
  sender: { name: string; location: string; avatar?: string }
  receiver: { name: string; location: string }
  service: string
  dimensions: string
  weight: string
  status: ShipmentStatus
  trackingNumber?: string
  dealId?: string
}

export interface ChatMessage {
  id: string
  content: string
  sender: "user" | "other" | "system"
  timestamp: string
  read?: boolean
  images?: string[]
}

export interface ChatThread {
  id: string
  name: string
  avatar?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  online: boolean
  dealId?: string
}

export interface SupportTicket {
  id: string
  subject: string
  status: "open" | "pending" | "resolved"
  createdAt: string
  messageCount: number
}

export type AppMode = "deal" | "ship"
