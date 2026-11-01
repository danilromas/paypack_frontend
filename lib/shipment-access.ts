import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest()
}

/**
 * Booking is temporarily invite-only: every label is billed to PayPack's Sendcloud account until users pay
 * by card themselves. Fails closed, so with SHIPMENT_BOOKING_PASSWORD unset nobody can book.
 */
export function isBookingPasswordValid(password: unknown): boolean {
  const expected = process.env.SHIPMENT_BOOKING_PASSWORD
  if (!expected || typeof password !== "string") return false
  return timingSafeEqual(digest(password), digest(expected))
}
