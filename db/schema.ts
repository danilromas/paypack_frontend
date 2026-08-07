import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  check,
  index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("users_role_check", sql`${table.role} in ('user', 'admin')`),
])

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  imagesJson: text("images_json").notNull().default(""),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  shippingPrice: numeric("shipping_price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: text("status").notNull(),
  role: text("role").notNull(),
  counterparty: text("counterparty").notNull().default(""),
  counterpartyAvatar: text("counterparty_avatar"),
  sourceUrl: text("source_url"),
  sourcePlatform: text("source_platform"),
  paymentMethod: text("payment_method"),
  paymentCryptoCoin: text("payment_crypto_coin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check(
    "deals_status_check",
    sql`${table.status} in ('pending', 'escrow', 'shipped', 'in-transit', 'delivered', 'completed', 'disputed', 'cancelled')`,
  ),
  check("deals_role_check", sql`${table.role} in ('buyer', 'seller')`),
  index("deals_created_at_idx").on(table.createdAt.desc()),
  index("deals_user_id_idx").on(table.userId),
])

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  dealId: uuid("deal_id").references(() => deals.id),
  senderName: text("sender_name").notNull(),
  senderLocation: text("sender_location").notNull(),
  receiverName: text("receiver_name").notNull(),
  receiverLocation: text("receiver_location").notNull(),
  service: text("service").notNull(),
  dimensions: text("dimensions").notNull(),
  weight: text("weight").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("shipments_status_check", sql`${table.status} in ('arrived', 'in-transit', 'pending')`),
  index("shipments_user_id_idx").on(table.userId),
])
