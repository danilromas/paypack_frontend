import "server-only"
import { shipments } from "@/db/schema"
import { syncEurosenderShipment } from "@/lib/eurosender-sync"
import { syncSendcloudShipment } from "@/lib/sendcloud-sync"

type ShipmentRow = typeof shipments.$inferSelect

/** How often one shipment may be re-read from its carrier when its owner opens the list. */
const MIN_INTERVAL_MS = 2 * 60 * 1000
/** The list must still load fast if a carrier API hangs; slower syncs finish in the background. */
const WAIT_MS = 4000
/** Keeps a long list from firing dozens of carrier calls at once. */
const MAX_PER_REQUEST = 15

const lastSync = new Map<string, number>()

function syncOne(row: ShipmentRow): Promise<ShipmentRow> {
  if (row.provider === "sendcloud") return syncSendcloudShipment(row)
  if (row.provider === "eurosender") return syncEurosenderShipment(row)
  return Promise.resolve(row)
}

/**
 * Re-reads undelivered carrier shipments so statuses move even when no webhook reaches us. Webhooks stay
 * the fast path; this is the safety net. Failures keep the stored row — the next load tries again.
 */
export async function refreshActiveShipments(rows: ShipmentRow[], now = Date.now()): Promise<ShipmentRow[]> {
  const due = rows
    .filter(
      (r) =>
        r.status !== "arrived" &&
        (r.provider === "sendcloud" || r.provider === "eurosender") &&
        r.providerOrderCode &&
        now - (lastSync.get(r.id) ?? 0) >= MIN_INTERVAL_MS,
    )
    .slice(0, MAX_PER_REQUEST)
  if (due.length === 0) return rows

  for (const r of due) lastSync.set(r.id, now)

  const updated = new Map<string, ShipmentRow>()
  const work = Promise.all(
    due.map((r) =>
      syncOne(r)
        .then((next) => {
          updated.set(r.id, next)
        })
        .catch((error) => {
          console.error(`Shipment status refresh failed for ${r.id}`, error instanceof Error ? error.message : error)
        }),
    ),
  )
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([work, new Promise((resolve) => (timer = setTimeout(resolve, WAIT_MS)))])
  clearTimeout(timer)

  return rows.map((r) => updated.get(r.id) ?? r)
}
