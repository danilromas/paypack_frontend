import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { extractWebhookParcel, isSendcloudEnabled, verifyWebhookSignature } from "@/lib/sendcloud"
import { syncSendcloudShipment } from "@/lib/sendcloud-sync"

/**
 * Sendcloud webhook receiver. In Sendcloud → Settings → Integrations → Sendcloud API → Configure, enable
 * "Webhook feedback" with the URL https://<host>/api/webhooks/sendcloud/. Requests are signed with
 * HMAC-SHA256 of the raw body using our secret key; the actual state always comes from the API.
 */
export async function POST(req: Request) {
  if (!isSendcloudEnabled()) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const raw = await req.text()
  if (!verifyWebhookSignature(raw, req.headers.get("sendcloud-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: unknown = null
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { shipmentId, trackingNumber } = extractWebhookParcel(body)
  const match = shipmentId
    ? eq(shipments.providerOrderCode, shipmentId)
    : trackingNumber
      ? eq(shipments.trackingNumber, trackingNumber)
      : null
  if (!match) return NextResponse.json({ ok: true })

  const rows = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.provider, "sendcloud"), match))
    .limit(1)
  if (rows[0]) {
    try {
      await syncSendcloudShipment(rows[0])
    } catch (error) {
      // Acknowledge anyway; the next event (or a manual refresh) will catch up.
      console.error(`Sendcloud webhook sync failed for shipment ${rows[0].providerOrderCode}`, error)
    }
  }

  return NextResponse.json({ ok: true })
}
