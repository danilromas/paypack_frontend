export type DealStatus = "pending" | "escrow" | "shipped" | "in-transit" | "delivered" | "completed" | "disputed" | "cancelled"

export interface Deal {
  id: string
  title: string
  description: string
  imageUrl?: string
  price: number
  shippingPrice: number
  currency: string
  status: DealStatus
  role: "buyer" | "seller"
  counterparty: string
  counterpartyAvatar?: string
  sourceUrl?: string
  sourcePlatform?: string
  paymentMethod?: string
  paymentCryptoCoin?: string
  createdAt: string
  updatedAt: string
  images?: string[]
}

export interface SupportTicket {
  id: string
  subject: string
  status: "open" | "pending" | "resolved"
  createdAt: string
  messageCount: number
}

export type AppMode = "deal" | "ship"
