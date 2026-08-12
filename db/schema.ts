import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  check,
  index,
  uniqueIndex,
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
  loginAlertsEnabled: boolean("login_alerts_enabled").notNull().default(true),
  requireWithdrawalConfirmation: boolean("require_withdrawal_confirmation").notNull().default(false),
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

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"),
  relatedDealId: uuid("related_deal_id").references(() => deals.id),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("wallet_tx_type_check", sql`${table.type} in ('topup', 'withdrawal', 'payout')`),
  check(
    "wallet_tx_status_check",
    sql`${table.status} in ('pending', 'processing', 'completed', 'failed')`,
  ),
  index("wallet_tx_user_id_idx").on(table.userId),
  index("wallet_tx_created_at_idx").on(table.createdAt.desc()),
])

export const dealParticipants = pgTable("deal_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  role: text("role").notNull(),
  invitedEmail: text("invited_email"),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("deal_participants_role_check", sql`${table.role} in ('buyer', 'seller')`),
  uniqueIndex("deal_participants_deal_user_idx")
    .on(table.dealId, table.userId)
    .where(sql`${table.userId} is not null`),
  uniqueIndex("deal_participants_deal_email_idx")
    .on(table.dealId, table.invitedEmail)
    .where(sql`${table.invitedEmail} is not null`),
  index("deal_participants_user_id_idx").on(table.userId),
])

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().unique().references(() => deals.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => chatThreads.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("chat_messages_thread_created_idx").on(table.threadId, table.createdAt),
])

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  relatedHref: text("related_href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("notifications_type_check", sql`${table.type} in ('deal', 'shipment', 'security', 'wallet', 'chat')`),
  index("notifications_user_created_idx").on(table.userId, table.createdAt.desc()),
])

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  openedByUserId: uuid("opened_by_user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("open"),
  reason: text("reason").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
  check("disputes_status_check", sql`${table.status} in ('open', 'needs-info', 'resolved')`),
  index("disputes_deal_id_idx").on(table.dealId),
  index("disputes_created_at_idx").on(table.createdAt.desc()),
])

export const disputeEvents = pgTable("dispute_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dispute_events_dispute_id_idx").on(table.disputeId, table.createdAt),
])

export const kycVerifications = pgTable("kyc_verifications", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  status: text("status").notNull().default("unverified"),
  riskLevel: text("risk_level").notNull().default("low"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("kyc_status_check", sql`${table.status} in ('unverified', 'pending', 'approved', 'rejected')`),
  check("kyc_risk_check", sql`${table.riskLevel} in ('low', 'medium', 'high')`),
])

export const kycDocuments = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  docType: text("doc_type").notNull(),
  fileUrl: text("file_url").notNull(),
  reviewStatus: text("review_status").notNull().default("uploaded"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("kyc_documents_type_check", sql`${table.docType} in ('id', 'proof_of_address', 'selfie')`),
  check(
    "kyc_documents_review_check",
    sql`${table.reviewStatus} in ('uploaded', 'needs_review', 'verified', 'rejected')`,
  ),
  index("kyc_documents_user_id_idx").on(table.userId),
])

export const riskFlags = pgTable("risk_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  label: text("label").notNull(),
  source: text("source").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("risk_flags_user_id_idx").on(table.userId),
])

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(),
  brand: text("brand"),
  last4: text("last4"),
  holderName: text("holder_name"),
  expiry: text("expiry"),
  bankName: text("bank_name"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("payment_methods_kind_check", sql`${table.kind} in ('card', 'bank')`),
  index("payment_methods_user_id_idx").on(table.userId),
])

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  label: text("label").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPreview: text("key_preview").notNull(),
  environment: text("environment").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  check("api_keys_environment_check", sql`${table.environment} in ('live', 'test')`),
  check("api_keys_status_check", sql`${table.status} in ('active', 'revoked')`),
  index("api_keys_user_id_idx").on(table.userId),
])

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  emailDealUpdates: boolean("email_deal_updates").notNull().default(true),
  emailPaymentReceived: boolean("email_payment_received").notNull().default(true),
  emailMarketing: boolean("email_marketing").notNull().default(false),
  pushNewMessages: boolean("push_new_messages").notNull().default(true),
  pushShippingUpdates: boolean("push_shipping_updates").notNull().default(true),
  pushSecurityAlerts: boolean("push_security_alerts").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

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
