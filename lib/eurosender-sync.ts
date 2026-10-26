import "server-only"
import { shipments } from "@/db/schema"
import { applyCarrierSnapshot } from "@/lib/shipment-sync"
import { getOrder, getTracking, mapTrackingStatus } from "@/lib/eurosender"

type ShipmentRow = typeof shipments.$inferSelect

/**
 * Re-reads an order's state from Eurosender and stores it. Webhook bodies are never trusted directly —
 * Eurosender doesn't document its signature scheme — so every update goes through this API fetch.
 */
export async function syncEurosenderShipment(row: ShipmentRow): Promise<ShipmentRow> {
  if (row.provider !== "eurosender" || !row.providerOrderCode) return row

  const [order, tracking] = await Promise.all([
    getOrder(row.providerOrderCode),
    getTracking(row.providerOrderCode).catch(() => null),
  ])

  return applyCarrierSnapshot(row, {
    status: mapTrackingStatus(tracking?.status ?? null),
    trackingNumber: tracking?.trackingNumber ?? order.trackingNumber,
    trackingUrl: order.trackingUrl,
    labelUrl: order.labelUrl,
    carrierName: order.carrierName,
    lastMessage: tracking?.lastMessage ?? null,
  })
}
