export type DealStatus = "pending" | "escrow" | "shipped" | "completed" | "disputed" | "cancelled"

export interface Deal {
  id: string
  title: string
  description: string
  imageUrl?: string
  price: number
  shippingPrice: number
  currency: string
  status: DealStatus
  /** The deal creator's role. Kept for the creation payload; for display, use `myRole`. */
  role: "buyer" | "seller"
  /** The viewing user's role in this deal — may differ from `role` if they're the invited counterparty. */
  myRole: "buyer" | "seller"
  counterparty: string
  counterpartyAvatar?: string
  /** Real linked counterparty name, once they've joined — falls back to the free-text `counterparty` until then. */
  counterpartyName: string | null
  counterpartyJoined: boolean
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
