import "server-only"
import { shipments } from "@/db/schema"
import { applyCarrierSnapshot } from "@/lib/shipment-sync"
import { getShipment, mapParcelStatus } from "@/lib/sendcloud"

type ShipmentRow = typeof shipments.$inferSelect

/** Re-reads a shipment from Sendcloud and stores it. Webhooks only trigger this; the API is the source of truth. */
export async function syncSendcloudShipment(row: ShipmentRow): Promise<ShipmentRow> {
  if (row.provider !== "sendcloud" || !row.providerOrderCode) return row

  const shipment = await getShipment(row.providerOrderCode)
  return applyCarrierSnapshot(row, {
    status: mapParcelStatus(shipment.statusCode),
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    labelUrl: shipment.labelUrl,
    carrierName: shipment.carrierName,
    lastMessage: shipment.statusMessage,
  })
}
