import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { shipments } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/session"
import type { SavedParty } from "@/lib/shipments"

const MAX_PER_SIDE = 20

/**
 * The user's address book: senders and receivers from their own earlier shipments, newest first,
 * one entry per distinct person + address. Built from shipment history, so there's nothing to manage.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const rows = await db
      .select({
        senderName: shipments.senderName,
        receiverName: shipments.receiverName,
        senderAddress: shipments.senderAddress,
        receiverAddress: shipments.receiverAddress,
      })
      .from(shipments)
      .where(eq(shipments.userId, user.id))
      .orderBy(desc(shipments.createdAt))
      .limit(300)

    const collect = (side: "sender" | "receiver") => {
      const seen = new Set<string>()
      const out: SavedParty[] = []
      for (const r of rows) {
        const address = side === "sender" ? r.senderAddress : r.receiverAddress
        const name = (side === "sender" ? r.senderName : r.receiverName).trim()
        if (!address?.country || !address.zip || !address.street || !name) continue
        const key = [name, address.country, address.zip, address.street, address.city].join("|").toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        // A pickup point belongs to one booking, not to the person — never carry it over.
        out.push({
          name,
          country: address.country,
          zip: address.zip,
          city: address.city,
          street: address.street,
          phone: address.phone,
          email: address.email,
          state: address.state ?? null,
        })
        if (out.length >= MAX_PER_SIDE) break
      }
      return out
    }

    return NextResponse.json({ senders: collect("sender"), receivers: collect("receiver") })
  } catch (error) {
    console.error("GET /api/shipments/addresses failed", error)
    return NextResponse.json({ error: "Failed to load saved addresses" }, { status: 500 })
  }
}
