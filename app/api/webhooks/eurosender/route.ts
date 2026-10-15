import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { extractWebhookOrderCodes, isEurosenderEnabled } from "@/lib/eurosender"
import { syncEurosenderShipment } from "@/lib/eurosender-sync"

/**
 * Eurosender webhook receiver. Register it in Eurosender → User dashboard → Eurosender API as
 *   https://<host>/api/webhooks/eurosender?token=<EUROSENDER_WEBHOOK_SECRET>
 * The token only gates who can make us re-sync; the actual state always comes from the Eurosender API.
 */
export async function POST(req: Request) {
  const secret = process.env.EUROSENDER_WEBHOOK_SECRET
  if (!secret || !isEurosenderEnabled()) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const token = new URL(req.url).searchParams.get("token") ?? ""
  if (!safeEqual(token, secret)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const orderCodes = extractWebhookOrderCodes(body)

  for (const code of orderCodes) {
    const rows = await db.select().from(shipments).where(eq(shipments.providerOrderCode, code)).limit(1)
    if (!rows[0]) continue
    try {
      await syncEurosenderShipment(rows[0])
    } catch (error) {
      // Acknowledge anyway; the next event (or a manual refresh) will catch up.
      console.error(`Eurosender webhook sync failed for order ${code}`, error)
    }
  }

  return NextResponse.json({ ok: true })
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
