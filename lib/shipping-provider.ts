import "server-only"
import { isEurosenderEnabled } from "@/lib/eurosender"
import { isSendcloudEnabled, sendcloudSenderCountries, sendcloudServesSender } from "@/lib/sendcloud"
import { needsCustoms } from "@/lib/shipments"

export type LiveProvider = "sendcloud" | "eurosender"

/** True when shipments are booked with a real carrier rather than our internal estimate. */
export function isLiveShippingEnabled(): boolean {
  return isSendcloudEnabled() || isEurosenderEnabled()
}

/**
 * Which broker books this route. Sendcloud wins where its contracts cover the sender; Eurosender takes the
 * rest inside the EU. Parcels leaving the EU need customs documents, which only our Sendcloud bookings
 * carry. Null means no live broker can serve the route.
 */
export function liveProviderFor(senderCountry: string, receiverCountry?: string | null): LiveProvider | null {
  if (sendcloudServesSender(senderCountry)) return "sendcloud"
  if (needsCustoms(receiverCountry)) return null
  if (isEurosenderEnabled()) return "eurosender"
  return null
}

export function unsupportedRouteMessage(receiverCountry?: string | null): string {
  const from = sendcloudSenderCountries().join(", ")
  return needsCustoms(receiverCountry)
    ? `Shipping outside the EU is only available from ${from} right now`
    : `We can only book couriers from ${from} right now`
}
