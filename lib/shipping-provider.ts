import "server-only"
import { isEurosenderEnabled } from "@/lib/eurosender"
import { isSendcloudEnabled, sendcloudSenderCountries, sendcloudServesSender } from "@/lib/sendcloud"

export type LiveProvider = "sendcloud" | "eurosender"

/** True when shipments are booked with a real carrier rather than our internal estimate. */
export function isLiveShippingEnabled(): boolean {
  return isSendcloudEnabled() || isEurosenderEnabled()
}

/**
 * Which broker books a shipment from this sender country. Sendcloud wins where its contracts cover the
 * sender; Eurosender takes the rest. Null means no live broker can serve this sender.
 */
export function liveProviderFor(senderCountry: string): LiveProvider | null {
  if (sendcloudServesSender(senderCountry)) return "sendcloud"
  if (isEurosenderEnabled()) return "eurosender"
  return null
}

export function unsupportedSenderMessage(): string {
  return `We can only book couriers from ${sendcloudSenderCountries().join(", ")} right now`
}
