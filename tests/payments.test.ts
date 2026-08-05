import { describe, expect, it } from "vitest"
import { buildDemoCryptoAddress } from "../lib/payments"

describe("buildDemoCryptoAddress", () => {
  it("is deterministic for the same coin + dealId", () => {
    const a = buildDemoCryptoAddress("BTC", "deal-1")
    const b = buildDemoCryptoAddress("BTC", "deal-1")
    expect(a).toBe(b)
  })

  it("is always clearly prefixed as a demo placeholder", () => {
    const address = buildDemoCryptoAddress("ETH", "deal-1")
    expect(address).toMatch(/^DEMO-ETH-[0-9a-f]{8}-PREVIEW$/)
  })

  it("differs across coins for the same deal", () => {
    const btc = buildDemoCryptoAddress("BTC", "deal-1")
    const eth = buildDemoCryptoAddress("ETH", "deal-1")
    const usdt = buildDemoCryptoAddress("USDT_TRC20", "deal-1")
    expect(new Set([btc, eth, usdt]).size).toBe(3)
  })

  it("differs across deals for the same coin", () => {
    const a = buildDemoCryptoAddress("BTC", "deal-1")
    const b = buildDemoCryptoAddress("BTC", "deal-2")
    expect(a).not.toBe(b)
  })
})
