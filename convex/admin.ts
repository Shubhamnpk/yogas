import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { hashPassword, isDemoSeedEnabled, optionalSession } from "./auth";

const ADMIN_EMAIL = "admin@YoGas.app";

async function adminAccount(ctx: any, token?: string) {
  const session = await optionalSession(ctx, token);
  if (!session) return null;
  return session.account.role === "admin" ? session.account : null;
}

async function requireAdmin(ctx: any, token?: string) {
  const admin = await adminAccount(ctx, token);
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
    if (!isDemoSeedEnabled()) throw new ConvexError("Admin seeding is disabled");
    const email = ADMIN_EMAIL.toLowerCase();
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (existing) {
      if (!existing.password.startsWith("pbkdf2$")) {
        await ctx.db.patch(existing._id, { password: await hashPassword("admin1234") });
      }
      return existing._id;
    }
    const id = await ctx.db.insert("accounts", {
      email,
      password: await hashPassword("admin1234"),
      role: "admin",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const dashboardStats = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const [users, dealers, entries, pending, accounts, logs] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("dealers").collect(),
      ctx.db.query("waitlistEntries").collect(),
      ctx.db.query("dealers").filter((q) => q.eq(q.field("approvalStatus"), "pending")).collect(),
      ctx.db.query("accounts").collect(),
      ctx.db.query("auditLogs").collect(),
    ]);
    return {
      users: users.length,
      dealers: dealers.length,
      entries: entries.length,
      pendingDealers: pending.length,
      accounts: accounts.length,
      logs: logs.length,
    };
  },
});

export const listDealers = query({
  args: {
    sessionToken: v.optional(v.string()),
    status: v.optional(approvalStatus),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    let base = ctx.db.query("dealers");
    if (args.status) {
      base = base.filter((q) => q.eq(q.field("approvalStatus"), args.status!));
    }
    const [page, countRows] = await Promise.all([
      base.order("desc").paginate(args.paginationOpts),
      args.status
        ? ctx.db.query("dealers").filter((q) => q.eq(q.field("approvalStatus"), args.status!)).collect()
        : ctx.db.query("dealers").collect(),
    ]);
    const pageRows = await Promise.all(
      page.page.map(async (d) => {
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
    );
    return { ...page, page: pageRows, count: countRows.length };
  },
});

export const listUsers = query({
  args: { sessionToken: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const [page, countRows] = await Promise.all([
      ctx.db.query("users").order("desc").paginate(args.paginationOpts),
      ctx.db.query("users").collect(),
    ]);
    const pageRows = await Promise.all(
      page.page.map(async (u) => {
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
    );
    return { ...page, page: pageRows, count: countRows.length };
  },
});

export const listEntries = query({
  args: { sessionToken: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const [page, countRows] = await Promise.all([
      ctx.db.query("waitlistEntries").order("desc").paginate(args.paginationOpts),
      ctx.db.query("waitlistEntries").collect(),
    ]);
    const pageRows = await Promise.all(
      page.page.map(async (e) => {
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
    );
    return { ...page, page: pageRows, count: countRows.length };
  },
});

export const reviewDealer = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    dealerId: v.id("dealers"),
    decision: approvalStatus,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
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
    dealerId: v.id("dealers"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
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
    dealerId: v.id("dealers"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
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
    targetAccountId: v.id("accounts"),
    role: v.union(v.literal("consumer"), v.literal("dealer")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
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

export const deleteUser = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    const userDoc = await ctx.db.get(args.userId);
    if (!userDoc) throw new ConvexError("User not found");
    const account = await ctx.db.get(userDoc.accountId);
    if (account && account.role === "admin") {
      throw new ConvexError("Cannot delete an admin account");
    }
    const userEntries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", userDoc.accountId))
      .collect();
    for (const entry of userEntries) {
      if (entry.status !== "collected") {
        await ctx.db.patch(entry._id, { status: "cancelled" });
      }
    }
    if (account) {
      await ctx.db.delete(account._id);
    }
    await ctx.db.delete(userDoc._id);
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: "admin:deleteUser",
      targetType: "user",
      targetId: String(userDoc._id),
      details: userDoc.fullName,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const adminCancelEntry = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    entryId: v.id("waitlistEntries"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new ConvexError("Entry not found");
    await ctx.db.patch(entry._id, { status: "cancelled" });
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: "admin:cancelEntry",
      targetType: "waitlistEntry",
      targetId: String(entry._id),
      details: `Cancelled entry for consumer ${entry.consumerAccountId}`,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const bulkReviewDealers = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    dealerIds: v.array(v.id("dealers")),
    decision: approvalStatus,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    for (const id of args.dealerIds) {
      const dealer = await ctx.db.get(id);
      if (dealer) {
        await ctx.db.patch(dealer._id, {
          approvalStatus: args.decision,
          isActive: args.decision === "approved",
          reviewedAt: Date.now(),
          reviewedByAccountId: admin._id,
        });
        await ctx.db.insert("notifications", {
          accountId: dealer.ownerAccountId,
          title: args.decision === "approved" ? "Depot approved" : "Depot application rejected",
          body: args.decision === "approved"
            ? "Your depot is now approved and active."
            : "Your depot application was rejected by an administrator.",
          read: false,
          createdAt: Date.now(),
        });
      }
    }
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: `admin:bulk_${args.decision}`,
      targetType: "dealer",
      details: `${args.dealerIds.length} dealers`,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const bulkDeleteDealers = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    dealerIds: v.array(v.id("dealers")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    for (const id of args.dealerIds) {
      const dealer = await ctx.db.get(id);
      if (dealer) {
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
        await ctx.db.delete(dealer._id);
      }
    }
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: "admin:bulkDeleteDealers",
      targetType: "dealer",
      details: `${args.dealerIds.length} dealers deleted`,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const bulkCancelEntries = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    entryIds: v.array(v.id("waitlistEntries")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.sessionToken);
    for (const id of args.entryIds) {
      const entry = await ctx.db.get(id);
      if (entry && entry.status !== "collected") {
        await ctx.db.patch(entry._id, { status: "cancelled" });
      }
    }
    await ctx.db.insert("auditLogs", {
      actorAccountId: admin._id,
      action: "admin:bulkCancelEntries",
      targetType: "waitlistEntry",
      details: `${args.entryIds.length} entries cancelled`,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const listAuditLogs = query({
  args: { sessionToken: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const [page, countRows] = await Promise.all([
      ctx.db.query("auditLogs").order("desc").paginate(args.paginationOpts),
      ctx.db.query("auditLogs").collect(),
    ]);
    return {
      ...page,
      page: page.page.map((l) => ({
        id: l._id,
        actorAccountId: l.actorAccountId ?? null,
        action: l.action,
        targetType: l.targetType ?? null,
        targetId: l.targetId ?? null,
        details: l.details ?? null,
        createdAt: l.createdAt,
      })),
      count: countRows.length,
    };
  },
});

export const dealerActivityLogs = query({
  args: { sessionToken: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const session = await optionalSession(ctx, args.sessionToken);
    if (!session) {
      return { page: [], isDone: true, continueCursor: "" } as any;
    }
    const account = session.account;
    const dealer = await ctx.db
      .query("dealers")
      .withIndex("by_owner", (q: any) => q.eq("ownerAccountId", account._id))
      .first();
    if (!dealer) {
      return { page: [], isDone: true, continueCursor: "" } as any;
    }
    const filterFn = (q: any) =>
      q.or(
        q.eq(q.field("actorAccountId"), account._id),
        q.and(
          q.eq(q.field("targetType"), "dealer"),
          q.eq(q.field("targetId"), String(dealer._id)),
        ),
      );
    const [page, countRows] = await Promise.all([
      ctx.db.query("auditLogs").filter(filterFn).order("desc").paginate(args.paginationOpts),
      ctx.db.query("auditLogs").filter(filterFn).collect(),
    ]);
    return {
      ...page,
      page: page.page.map((l) => ({
        id: l._id,
        actorAccountId: l.actorAccountId ?? null,
        action: l.action,
        targetType: l.targetType ?? null,
        targetId: l.targetId ?? null,
        details: l.details ?? null,
        createdAt: l.createdAt,
      })),
      count: countRows.length,
    };
  },
});
