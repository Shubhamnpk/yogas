import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const appRole = v.union(v.literal("consumer"), v.literal("dealer"), v.literal("admin"));

export const entryStatus = v.union(
  v.literal("waiting"),
  v.literal("allotted"),
  v.literal("collected"),
  v.literal("cancelled"),
);

export default defineSchema({
  accounts: defineTable({
    email: v.string(),
    password: v.string(),
    role: appRole,
    createdAt: v.number(),
  })
    .index("by_email", ["email"]),

  sessions: defineTable({
    token: v.string(),
    accountId: v.id("accounts"),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_account", ["accountId"]),

  users: defineTable({
    accountId: v.id("accounts"),
    fullName: v.string(),
    username: v.string(),
    citizenshipNo: v.optional(v.string()),
    address: v.optional(v.string()),
    district: v.optional(v.string()),
    phone: v.optional(v.string()),
    collectionCode: v.string(),
    totalPurchasedQuantity: v.optional(v.number()),
    lastCollectedAt: v.optional(v.number()),
    cooldownUntil: v.optional(v.number()),
    lastCollectedDealerId: v.optional(v.id("dealers")),
    createdAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_username", ["username"])
    .index("by_citizenship_no", ["citizenshipNo"])
    .index("by_collection_code", ["collectionCode"]),

  dealerProfiles: defineTable({
    accountId: v.id("accounts"),
    fullName: v.string(),
    username: v.string(),
    citizenshipNo: v.optional(v.string()),
    address: v.optional(v.string()),
    district: v.optional(v.string()),
    phone: v.optional(v.string()),
    collectionCode: v.optional(v.string()),
    totalPurchasedQuantity: v.optional(v.number()),
    lastCollectedAt: v.optional(v.number()),
    cooldownUntil: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_username", ["username"]),

  dealers: defineTable({
    ownerAccountId: v.id("accounts"),
    businessName: v.string(),
    licenseNo: v.optional(v.string()),
    district: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    stock: v.number(),
    code: v.string(),
    isActive: v.boolean(),
    approvalStatus: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedByAccountId: v.optional(v.id("accounts")),
  })
    .index("by_owner", ["ownerAccountId"])
    .index("by_code", ["code"])
    .index("by_active_district", ["isActive", "district"]),

  waitlistEntries: defineTable({
    dealerId: v.id("dealers"),
    consumerAccountId: v.id("accounts"),
    cylinderSize: v.string(),
    quantity: v.number(),
    note: v.optional(v.string()),
    status: entryStatus,
    createdAt: v.number(),
    allottedAt: v.optional(v.number()),
    collectedAt: v.optional(v.number()),
  })
    .index("by_consumer_status", ["consumerAccountId", "status"])
    .index("by_consumer_created", ["consumerAccountId", "createdAt"])
    .index("by_dealer_status_created", ["dealerId", "status", "createdAt"]),

  notifications: defineTable({
    accountId: v.id("accounts"),
    title: v.string(),
    body: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_account_created", ["accountId", "createdAt"]),

  auditLogs: defineTable({
    actorAccountId: v.optional(v.id("accounts")),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor_created", ["actorAccountId", "createdAt"])
    .index("by_action_created", ["action", "createdAt"]),
});
