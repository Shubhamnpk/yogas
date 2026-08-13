import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const ADMIN_EMAIL = "admin@YoGas.app";

async function adminAccount(ctx: any, value?: string) {
  if (!value) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", value))
    .first();
  if (!session) return null;
  const account = await ctx.db.get(session.accountId);
  return account?.role === "admin" ? account : null;
}

async function requireAdmin(ctx: any, value?: string) {
  const admin = await adminAccount(ctx, value);
  if (!admin) throw new ConvexError("Admin access required");
  return admin;
}

const approvalStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

export const ensureAdminAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const email = ADMIN_EMAIL.toLowerCase();
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (existing) return existing._id;
    const id = await ctx.db.insert("accounts", {
      email,
      password: "admin1234",
      role: "admin",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const dashboardStats = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const [users, dealers, entries, pending, accounts] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("dealers").collect(),
      ctx.db.query("waitlistEntries").collect(),
      ctx.db.query("dealers").filter((q) => q.eq(q.field("approvalStatus"), "pending")).collect(),
      ctx.db.query("accounts").collect(),
    ]);
    return {
      users: users.length,
      dealers: dealers.length,
      entries: entries.length,
      pendingDealers: pending.length,
      accounts: accounts.length,
    };
  },
});

export const listDealers = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const dealers = await ctx.db.query("dealers").collect();
    return Promise.all(
      dealers.map(async (d) => {
        const owner = await ctx.db.get(d.ownerAccountId);
        const waiting = await ctx.db
          .query("waitlistEntries")
          .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", d._id).eq("status", "waiting"))
          .collect();
        return {
          id: d._id,
          ownerAccountId: d.ownerAccountId,
          ownerEmail: owner?.email ?? null,
          businessName: d.businessName,
          district: d.district,
          address: d.address ?? null,
          phone: d.phone ?? null,
          licenseNo: d.licenseNo ?? null,
          code: d.code,
          stock: d.stock,
          isActive: d.isActive,
          approvalStatus: d.approvalStatus,
          requestedAt: d.requestedAt,
          reviewedAt: d.reviewedAt ?? null,
          waiting: waiting.length,
        };
      }),
    ).then((rows) => rows.sort((a, b) => b.requestedAt - a.requestedAt));
  },
});

export const listUsers = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const users = await ctx.db.query("users").collect();
    return Promise.all(
      users.map(async (u) => {
        const account = await ctx.db.get(u.accountId);
        return {
          id: u._id,
          accountId: u.accountId,
          email: account?.email ?? null,
          fullName: u.fullName,
          citizenshipNo: u.citizenshipNo ?? null,
          district: u.district ?? null,
          address: u.address ?? null,
          phone: u.phone ?? null,
          collectionCode: u.collectionCode,
          totalPurchasedQuantity: u.totalPurchasedQuantity ?? 0,
          createdAt: u.createdAt,
        };
      }),
    ).then((rows) => rows.sort((a, b) => a.createdAt - b.createdAt));
  },
});

export const listEntries = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const entries = await ctx.db.query("waitlistEntries").collect();
    return Promise.all(
      entries.map(async (e) => {
        const dealer = await ctx.db.get(e.dealerId);
        const consumer = await ctx.db.get(e.consumerAccountId);
        return {
          id: e._id,
          dealerId: e.dealerId,
          dealerName: dealer?.businessName ?? null,
          consumerAccountId: e.consumerAccountId,
          consumerEmail: consumer?.email ?? null,
          cylinderSize: e.cylinderSize,
          quantity: e.quantity,
          note: e.note ?? null,
          status: e.status,
          createdAt: e.createdAt,
          allottedAt: e.allottedAt ?? null,
          collectedAt: e.collectedAt ?? null,
        };
      }),
    ).then((rows) => rows.sort((a, b) => b.createdAt - a.createdAt));
  },
});

export const reviewDealer = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    dealerId: v.id("dealers"),
    decision: approvalStatus,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const dealer = await ctx.db.get(args.dealerId);
    if (!dealer) throw new ConvexError("Dealer not found");
    await ctx.db.patch(dealer._id, {
      approvalStatus: args.decision,
      isActive: args.decision === "approved",
      reviewedAt: Date.now(),
      reviewedByAccountId: admin._id,
    });
    await ctx.db.insert("notifications", {
      accountId: dealer.ownerAccountId,
      title: args.decision === "approved" ? "Depot approved" : "Depot application rejected",
      body:
        args.decision === "approved"
          ? "Your depot is now approved and active. You can start accepting waitlist requests."
          : "Your depot application was rejected by an administrator.",
      read: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: `admin:${args.decision}`,
      targetType: "dealer",
      targetId: String(dealer._id),
      details: dealer.businessName,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const unapproveDealer = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    dealerId: v.id("dealers"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const dealer = await ctx.db.get(args.dealerId);
    if (!dealer) throw new ConvexError("Dealer not found");
    await ctx.db.patch(dealer._id, {
      approvalStatus: "pending",
      isActive: false,
      reviewedAt: Date.now(),
      reviewedByAccountId: admin._id,
    });
    await ctx.db.insert("notifications", {
      accountId: dealer.ownerAccountId,
      title: "Depot approval revoked",
      body:
        "Your depot was unapproved by an administrator. It is no longer active until it is re-approved.",
      read: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: "admin:unapprove",
      targetType: "dealer",
      targetId: String(dealer._id),
      details: dealer.businessName,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const deleteDealer = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    dealerId: v.id("dealers"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const dealer = await ctx.db.get(args.dealerId);
    if (!dealer) throw new ConvexError("Dealer not found");
    const entries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", dealer._id))
      .collect();
    await Promise.all(
      entries.map((entry) =>
        ctx.db.patch(entry._id, {
          status: entry.status === "collected" ? entry.status : "cancelled",
        }),
      ),
    );
    await ctx.db.insert("notifications", {
      accountId: dealer.ownerAccountId,
      title: "Depot removed",
      body: "Your depot was deleted by an administrator.",
      read: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: "admin:deleteDealer",
      targetType: "dealer",
      targetId: String(dealer._id),
      details: dealer.businessName,
      createdAt: Date.now(),
    });
    await ctx.db.delete(dealer._id);
    return true;
  },
});

export const setUserRole = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    targetAccountId: v.id("accounts"),
    role: v.union(v.literal("consumer"), v.literal("dealer"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    await ctx.db.patch(args.targetAccountId, { role: args.role });
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: "admin:setRole",
      targetType: "account",
      targetId: String(args.targetAccountId),
      details: args.role,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const listAuditLogs = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken ?? args.accountId);
    const logs = await ctx.db.query("auditLogs").collect();
    return logs
      .map((l) => ({
        id: l._id,
        actorAccountId: l.actorAccountId ?? null,
        action: l.action,
        targetType: l.targetType ?? null,
        targetId: l.targetId ?? null,
        details: l.details ?? null,
        createdAt: l.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  },
});

export const dealerActivityLogs = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const value = args.sessionToken ?? args.accountId;
    if (!value) return [];
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", value))
      .first();
    const account = session
      ? await ctx.db.get(session.accountId)
      : await ctx.db.get(value as Id<"accounts">);
    if (!account) return [];
    const dealer = await ctx.db
      .query("dealers")
      .withIndex("by_owner", (q: any) => q.eq("ownerAccountId", account._id))
      .first();
    if (!dealer) return [];
    const logs = await ctx.db.query("auditLogs").collect();
    return logs
      .filter(
        (l) =>
          l.actorAccountId === account._id ||
          l.targetType === "dealer" && l.targetId === String(dealer._id),
      )
      .map((l) => ({
        id: l._id,
        actorAccountId: l.actorAccountId ?? null,
        action: l.action,
        targetType: l.targetType ?? null,
        targetId: l.targetId ?? null,
        details: l.details ?? null,
        createdAt: l.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);
  },
});