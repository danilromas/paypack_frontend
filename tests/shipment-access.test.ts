import { afterEach, describe, expect, it } from "vitest"
import { isBookingPasswordValid } from "../lib/shipment-access"

describe("isBookingPasswordValid", () => {
  const original = process.env.SHIPMENT_BOOKING_PASSWORD
  afterEach(() => {
    if (original === undefined) delete process.env.SHIPMENT_BOOKING_PASSWORD
    else process.env.SHIPMENT_BOOKING_PASSWORD = original
  })

  it("accepts only the exact password", () => {
    process.env.SHIPMENT_BOOKING_PASSWORD = "correct horse"
    expect(isBookingPasswordValid("correct horse")).toBe(true)
    expect(isBookingPasswordValid("correct hors")).toBe(false)
    expect(isBookingPasswordValid("")).toBe(false)
    expect(isBookingPasswordValid(undefined)).toBe(false)
    expect(isBookingPasswordValid(12345)).toBe(false)
  })

  it("fails closed when no password is configured", () => {
    delete process.env.SHIPMENT_BOOKING_PASSWORD
    expect(isBookingPasswordValid("anything")).toBe(false)
    expect(isBookingPasswordValid("")).toBe(false)
    process.env.SHIPMENT_BOOKING_PASSWORD = ""
    expect(isBookingPasswordValid("")).toBe(false)
  })
})
