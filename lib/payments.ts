export type PaymentMethod = "card" | "bank_transfer" | "crypto"
export type CryptoCoin = "BTC" | "ETH" | "USDT_TRC20"

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "crypto", label: "Crypto" },
]

export const CRYPTO_COINS: { value: CryptoCoin; label: string }[] = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "USDT_TRC20", label: "USDT (TRC-20)" },
]

/**
 * Deterministic per-deal placeholder address for the MVP crypto-payment preview.
 * Deliberately not a valid-looking real address format (no real blockchain
 * integration exists) so it can never be mistaken for a real, fundable wallet.
 */
export function buildDemoCryptoAddress(coin: CryptoCoin, dealId: string): string {
  const seed = `${coin}:${dealId}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const hex = hash.toString(16).padStart(8, "0")
  return `DEMO-${coin}-${hex}-PREVIEW`
}
