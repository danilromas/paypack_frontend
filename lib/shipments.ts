export type ShipmentStatus = "arrived" | "in-transit" | "pending"

export interface ShipmentPayload {
  senderName: string
  senderLocation: string
  receiverName: string
  receiverLocation: string
  service: string
  dimensions: string
  weight: string
  status: ShipmentStatus
}

export interface Shipment extends ShipmentPayload {
  id: string
  createdAt: string
}

export const defaultShipmentPayload: ShipmentPayload = {
  senderName: "",
  senderLocation: "",
  receiverName: "",
  receiverLocation: "",
  service: "Standard",
  dimensions: "0x0x0 cm",
  weight: "0 kg",
  status: "pending",
}
