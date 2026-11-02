import { describe, expect, it } from "vitest"
import {
  formatShipmentAddress,
  needsCustoms,
  needsState,
  normalizeShipmentAddress,
  validateShipmentAddress,
} from "../lib/shipments"

describe("shipping to the United States", () => {
  const us = {
    country: "US",
    zip: "98272",
    city: "Monroe",
    street: "19235 133rd St SE",
    state: "wa",
    phone: "+1 425 555 0100",
    email: "a@b.com",
  }

  it("is a customs destination that needs a state", () => {
    expect(needsCustoms("us")).toBe(true)
    expect(needsState("US")).toBe(true)
    expect(needsState("CH")).toBe(false)
  })

  it("requires a two-letter state for US receivers only", () => {
    expect(validateShipmentAddress(us, "receiver")).toBeNull()
    expect(validateShipmentAddress({ ...us, state: "" }, "receiver")).toMatch(/state/)
    expect(validateShipmentAddress({ ...us, state: "Washington" }, "receiver")).toMatch(/state/)
    expect(validateShipmentAddress(us, "sender")).toMatch(/from inside the EU/)
  })

  it("normalizes the state and shows it in the one-line address", () => {
    const n = normalizeShipmentAddress(us)
    expect(n.state).toBe("WA")
    expect(formatShipmentAddress(n)).toBe("19235 133rd St SE, 98272 Monroe WA, US")
  })

  it("drops a stray state on countries that don't use one", () => {
    const it_ = { country: "IT", zip: "10035", city: "Mazzè", street: "Via del Ponticello 14", phone: "+39340", email: "a@b.it", state: "TO" }
    expect(normalizeShipmentAddress(it_).state).toBeUndefined()
  })
})
