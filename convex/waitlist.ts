import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { entryStatus } from "./schema";

const activeStatusValues = ["waiting", "allotted"] as const;
const activeStatuses = new Set<string>(activeStatusValues);
const DEFAULT_COOLDOWN_DAYS = 14;
const DEFAULT_COOLDOWN_MS = DEFAULT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function collectedAtValue(entry: Doc<"waitlistEntries">) {
  return entry.collectedAt ?? 0;
}

/**
 * Fetch the full waiting line for each given dealer, keyed by dealerId.
 * Used to compute a consumer's true position among everyone waiting,
 * not just their own entries.
 */
async function dealerWaitingLines(
  ctx: any,
  dealerIds: Iterable<Id<"dealers">>,
): Promise<Map<string, Doc<"waitlistEntries">[]>> {
  const lines = new Map<string, Doc<"waitlistEntries">[]>();
  for (const dealerId of new Set(dealerIds)) {
    const rows = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_dealer_status_created", (q: any) =>
        q.eq("dealerId", dealerId).eq("status", "waiting"),
      )
      .collect();
    rows.sort((a, b) => a.createdAt - b.createdAt);
    lines.set(dealerId, rows);
  }
  return lines;
}

/** One-based index of `entry` within its dealer's waiting line, if waiting. */
function positionInLine(
  lines: Map<string, Doc<"waitlistEntries">[]>,
  entry: Doc<"waitlistEntries">,
): number | undefined {
  if (entry.status !== "waiting") return undefined;
  const line = lines.get(entry.dealerId);
  if (!line) return undefined;
  const index = line.findIndex((x) => x._id === entry._id);
  return index === -1 ? undefined : index + 1;
}

async function notify(ctx: { db: any }, accountId: Id<"accounts">, title: string, body?: string) {
  await ctx.db.insert("notifications", {
    accountId,
    title,
    body,
    read: false,
    createdAt: Date.now(),
  });
}

async function auditLog(
  ctx: { db: any },
  args: {
    actorAccountId?: Id<"accounts">;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: string;
  },
) {
  await ctx.db.insert("auditLogs", {
    actorAccountId: args.actorAccountId,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    details: args.details,
    createdAt: Date.now(),
  });
}

async function sessionByToken(ctx: any, token: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
}

async function accountByIdOrSession(ctx: any, value?: string) {
  if (!value) return null;
  const session = await sessionByToken(ctx, value);
  if (session) return await ctx.db.get(session.accountId);
  return await ctx.db.get(value as Id<"accounts">);
}

async function dealerByOwner(ctx: any, accountId: Id<"accounts">) {
  return await ctx.db
    .query("dealers")
    .withIndex("by_owner", (q: any) => q.eq("ownerAccountId", accountId))
    .first();
}

async function dealerFromTokenOrAccount(ctx: any, value?: string) {
  const account = await accountByIdOrSession(ctx, value);
  if (!account) return null;
  return await dealerByOwner(ctx, account._id);
}

function resolveActor(args: {
  sessionToken?: string;
  accountId?: string;
  ownerAccountId?: string;
  requesterAccountId?: string;
}) {
  return args.sessionToken ?? args.accountId ?? args.ownerAccountId ?? args.requesterAccountId;
}

async function accountSummary(ctx: any, accountId: Id<"accounts">) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .first();
  if (!user) return null;
  return {
    fullName: user.fullName,
    citizenshipNo: user.citizenshipNo,
    address: user.address,
    phone: user.phone,
    totalPurchasedQuantity: user.totalPurchasedQuantity ?? 0,
    lastCollectedAt: user.lastCollectedAt ?? null,
    cooldownUntil: user.cooldownUntil ?? null,
  };
}

async function allotOne(
  ctx: { db: any },
  dealer: Doc<"dealers">,
  entry: Doc<"waitlistEntries">,
) {
  await ctx.db.patch(entry._id, { status: "allotted", allottedAt: Date.now() });
  const waitingElsewhere = await ctx.db
    .query("waitlistEntries")
    .withIndex("by_consumer_status", (q: any) =>
      q.eq("consumerAccountId", entry.consumerAccountId).eq("status", "waiting"),
    )
    .collect();
  await Promise.all(
    waitingElsewhere
      .filter((other: Doc<"waitlistEntries">) => other._id !== entry._id)
      .map((other: Doc<"waitlistEntries">) => ctx.db.patch(other._id, { status: "cancelled" })),
  );
  await notify(
    ctx,
    entry.consumerAccountId,
    "Cylinder allotted",
    `Your cylinder at ${dealer.businessName} is reserved. Show your QR code at the depot to collect it.`,
  );
  await auditLog(ctx, {
    actorAccountId: dealer.ownerAccountId,
    action: "waitlist:allot",
    targetType: "waitlistEntry",
    targetId: String(entry._id),
    details: String(entry.quantity),
  });
}

export const listDealers = query({
  args: { district: v.optional(v.string()), search: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = args.district
      ? await ctx.db
          .query("dealers")
          .withIndex("by_active_district", (q) => q.eq("isActive", true).eq("district", args.district!))
          .collect()
      : await ctx.db.query("dealers").filter((q) => q.eq(q.field("isActive"), true)).collect();
    const search = args.search?.trim().toLowerCase();
    const filtered = rows
      .filter((d) => d.approvalStatus === "approved" && d.isActive)
      .filter((d) => !search || d.businessName.toLowerCase().includes(search))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, args.limit ?? 50);
    return Promise.all(
      filtered.map(async (dealer) => {
        const waiting = await ctx.db
          .query("waitlistEntries")
          .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", dealer._id).eq("status", "waiting"))
          .collect();
        return { ...dealer, waiting: waiting.length };
      }),
    );
  },
});

export const dealerByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("dealers")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .filter((q) => q.and(q.eq(q.field("approvalStatus"), "approved"), q.eq(q.field("isActive"), true)))
      .first(),
});

export const activeForConsumer = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) return [];
    const groups = await Promise.all(
      activeStatusValues.map((status) =>
        ctx.db
          .query("waitlistEntries")
          .withIndex("by_consumer_status", (q) =>
            q.eq("consumerAccountId", account._id).eq("status", status),
          )
          .collect(),
      ),
    );
    return groups.flat();
  },
});

export const consumerStats = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) {
      return { active: 0, waiting: 0, allotted: 0, history: 0 };
    }
    const rows = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
      .collect();
    return {
      active: rows.filter((row) => row.status === "waiting" || row.status === "allotted").length,
      waiting: rows.filter((row) => row.status === "waiting").length,
      allotted: rows.filter((row) => row.status === "allotted").length,
      history: rows.filter((row) => row.status === "collected" || row.status === "cancelled").length,
    };
  },
});

export const consumerPurchaseSummary = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) {
      return { user: null, totalQuantity: 0, totalPurchases: 0, lastCollectedAt: null, recent: [] };
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .first();
    const rows = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
      .collect();
    const collected = rows.filter((row) => row.status === "collected").sort((a, b) => collectedAtValue(b) - collectedAtValue(a));
    const totalQuantity = collected.reduce((sum, row) => sum + row.quantity, 0);
    return {
      user: user
        ? {
            fullName: user.fullName,
            citizenshipNo: user.citizenshipNo,
            totalPurchasedQuantity: user.totalPurchasedQuantity ?? totalQuantity,
            lastCollectedAt: user.lastCollectedAt ?? collected[0]?.collectedAt ?? null,
            cooldownUntil: user.cooldownUntil ?? null,
          }
        : null,
      totalQuantity,
      totalPurchases: collected.length,
      lastCollectedAt: collected[0]?.collectedAt ?? null,
      recent: await Promise.all(
        collected.slice(0, 6).map(async (entry) => ({
          ...entry,
          dealer: await ctx.db.get(entry.dealerId),
        })),
      ),
    };
  },
});

export const consumerEntries = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) return [];
    const rows = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
      .collect();
    const lines = await dealerWaitingLines(
      ctx,
      rows.filter((r) => r.status === "waiting").map((r) => r.dealerId),
    );
    return await Promise.all(
      rows
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (entry) => {
          const dealer = await ctx.db.get(entry.dealerId);
          const position = positionInLine(lines, entry);
          return { ...entry, dealer, position: position ?? undefined };
        }),
    );
  },
});

export const consumerWaitlistAll = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) return [];
    const rows = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
      .collect();
    const lines = await dealerWaitingLines(
      ctx,
      rows.filter((r) => r.status === "waiting").map((r) => r.dealerId),
    );
    const enriched = await Promise.all(
      rows.map(async (entry) => {
        const dealer = await ctx.db.get(entry.dealerId);
        const position = positionInLine(lines, entry);
        return { ...entry, dealer, position: position ?? undefined };
      }),
    );
    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const consumerWaitlistPage = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) {
      return { page: [], isDone: true, continueCursor: "" } as any;
    }
    const page = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const allRows = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
      .collect();
    const lines = await dealerWaitingLines(
      ctx,
      allRows.filter((r) => r.status === "waiting").map((r) => r.dealerId),
    );
    const enriched = await Promise.all(
      page.page.map(async (entry) => {
        const dealer = await ctx.db.get(entry.dealerId);
        const position = positionInLine(lines, entry);
        return { ...entry, dealer, position: position ?? undefined };
      }),
    );
    return { ...page, page: enriched };
  },
});

export const dealerWaitlistPage = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const dealer = await dealerFromTokenOrAccount(ctx, resolveActor(args));
    if (!dealer) {
      return { page: [], isDone: true, continueCursor: "" } as any;
    }
    const page = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", dealer._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const waitingAll = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_dealer_status_created", (q) =>
        q.eq("dealerId", dealer._id).eq("status", "waiting"),
      )
      .collect()
      .then((rows) => rows.sort((a, b) => a.createdAt - b.createdAt));
    const enriched = await Promise.all(
      page.page.map(async (entry) => {
        const position =
          entry.status === "waiting"
            ? (waitingAll.findIndex((x) => x._id === entry._id) ?? -1) + 1
            : undefined;
        return {
          ...entry,
          position: position || undefined,
          consumer: await accountSummary(ctx, entry.consumerAccountId),
        };
      }),
    );
    return { ...page, page: enriched };
  },
});

export const dealerQueue = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const dealer = await dealerFromTokenOrAccount(ctx, resolveActor(args));
    if (!dealer) {
      return { waiting: [], allotted: [], history: [], cancelled: [], hasMoreWaiting: false, hasMoreAllotted: false, hasMoreHistory: false, hasMoreCancelled: false };
    }
    const limit = Math.max(1, Math.min(args.limit ?? 100, 300));
    const [waitingRows, allottedRows, historyRows, cancelledRows] = await Promise.all([
      ctx.db
        .query("waitlistEntries")
        .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", dealer._id).eq("status", "waiting"))
        .take(limit + 1),
      ctx.db
        .query("waitlistEntries")
        .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", dealer._id).eq("status", "allotted"))
        .take(limit + 1),
      ctx.db
        .query("waitlistEntries")
        .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", dealer._id).eq("status", "collected"))
        .take(limit + 1),
      ctx.db
        .query("waitlistEntries")
        .withIndex("by_dealer_status_created", (q) => q.eq("dealerId", dealer._id).eq("status", "cancelled"))
        .take(limit + 1),
    ]);
    const waiting = waitingRows.slice(0, limit);
    const allotted = allottedRows.slice(0, limit);
    const history = historyRows.slice(0, limit);
    const cancelled = cancelledRows.slice(0, limit);
    return {
      waiting: await Promise.all(
        waiting.map(async (entry, index) => ({
          ...entry,
          position: index + 1,
          consumer: await accountSummary(ctx, entry.consumerAccountId),
        })),
      ),
      allotted: await Promise.all(
        allotted.map(async (entry) => ({
          ...entry,
          consumer: await accountSummary(ctx, entry.consumerAccountId),
        })),
      ),
      history: await Promise.all(
        history.map(async (entry) => ({
          ...entry,
          consumer: await accountSummary(ctx, entry.consumerAccountId),
        })),
      ),
      cancelled: await Promise.all(
        cancelled.map(async (entry) => ({
          ...entry,
          consumer: await accountSummary(ctx, entry.consumerAccountId),
        })),
      ),
      hasMoreWaiting: waitingRows.length > limit,
      hasMoreAllotted: allottedRows.length > limit,
      hasMoreHistory: historyRows.length > limit,
      hasMoreCancelled: cancelledRows.length > limit,
    };
  },
});

export const consumerEntryForDealer = query({
  args: { sessionToken: v.optional(v.string()), dealerId: v.id("dealers"), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, args.accountId ?? undefined);
    if (!account) return null;
    const entries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
      .collect();
    const entry = entries.find((row) => row.dealerId === args.dealerId && activeStatuses.has(row.status));
    if (!entry) return null;
    return {
      ...entry,
      consumer: await accountSummary(ctx, account._id),
    };
  },
});

export const consumerOverviewForDealer = query({
  args: { sessionToken: v.optional(v.string()), dealerId: v.id("dealers"), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, args.accountId ?? undefined);
    if (!account) return null;
    const [user, rows] = await Promise.all([
      ctx.db.query("users").withIndex("by_account", (q) => q.eq("accountId", account._id)).first(),
      ctx.db
        .query("waitlistEntries")
        .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
        .collect(),
    ]);
    if (!user) return null;
    const active = rows.find((row) => row.dealerId === args.dealerId && activeStatuses.has(row.status));
    const collected = rows.filter((row) => row.status === "collected").sort((a, b) => collectedAtValue(b) - collectedAtValue(a));
    const totalQuantity = collected.reduce((sum, row) => sum + row.quantity, 0);
    return {
      consumer: {
        fullName: user.fullName,
        citizenshipNo: user.citizenshipNo,
        address: user.address,
        phone: user.phone,
        totalPurchasedQuantity: user.totalPurchasedQuantity ?? totalQuantity,
        lastCollectedAt: user.lastCollectedAt ?? collected[0]?.collectedAt ?? null,
        cooldownUntil: user.cooldownUntil ?? null,
      },
      activeEntry: active
        ? {
            ...active,
            consumer: await accountSummary(ctx, account._id),
          }
        : null,
      totalQuantity,
      totalPurchases: collected.length,
      recent: await Promise.all(
        collected.slice(0, 8).map(async (entry) => ({
          ...entry,
          dealer: await ctx.db.get(entry.dealerId),
        })),
      ),
    };
  },
});

export const joinDepot = mutation({
  args: {
    dealerId: v.id("dealers"),
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    quantity: v.number(),
    cylinderSize: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) throw new ConvexError("Not signed in");
    const dealer = await ctx.db.get(args.dealerId);
    if (!dealer || !dealer.isActive || dealer.approvalStatus !== "approved") {
      throw new ConvexError("Depot is not accepting requests");
    }
    if (!Number.isInteger(args.quantity) || args.quantity !== 1) {
      throw new ConvexError("Only 1 cylinder can be requested at a time");
    }
    const consumer = await ctx.db.query("users").withIndex("by_account", (q) => q.eq("accountId", account._id)).first();
    if (consumer?.cooldownUntil && consumer.cooldownUntil > Date.now()) {
      throw new ConvexError("You can request gas again after your cooling period ends");
    }
    if (!consumer?.cooldownUntil) {
      const collected = await ctx.db
        .query("waitlistEntries")
        .withIndex("by_consumer_created", (q) => q.eq("consumerAccountId", account._id))
        .collect();
      const latestCollected = collected
        .filter((row) => row.status === "collected" && row.collectedAt)
        .sort((a, b) => collectedAtValue(b) - collectedAtValue(a))[0];
      if (latestCollected?.collectedAt && latestCollected.collectedAt + DEFAULT_COOLDOWN_MS > Date.now()) {
        throw new ConvexError("You can request gas again after your cooling period ends");
      }
    }
    const active = await Promise.all(
      activeStatusValues.map((status) =>
        ctx.db
          .query("waitlistEntries")
          .withIndex("by_consumer_status", (q) =>
            q.eq("consumerAccountId", account._id).eq("status", status),
          )
          .collect(),
      ),
    ).then((groups) => groups.flat());
    if (active.some((entry) => entry.status === "allotted")) {
      throw new ConvexError("You already have gas allotted. Collect it before requesting again.");
    }
    if (active.some((entry) => entry.dealerId === args.dealerId)) {
      throw new ConvexError("You are already in this depot queue.");
    }
    const entryId = await ctx.db.insert("waitlistEntries", {
      dealerId: args.dealerId,
      consumerAccountId: account._id,
      quantity: args.quantity,
      cylinderSize: args.cylinderSize,
      note: args.note?.trim() || undefined,
      status: "waiting",
      createdAt: Date.now(),
    });
    await auditLog(ctx, {
      actorAccountId: account._id,
      action: "waitlist:join",
      targetType: "waitlistEntry",
      targetId: String(entryId),
      details: `${args.dealerId}:${args.quantity}`,
    });
    return entryId;
  },
});

export const addConsumerToQueue = mutation({
  args: {
    consumerAccountId: v.id("accounts"),
    sessionToken: v.optional(v.string()),
    ownerAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dealer = await dealerFromTokenOrAccount(ctx, resolveActor(args));
    if (!dealer) throw new ConvexError("Not your depot");
    if (!dealer.isActive || dealer.approvalStatus !== "approved") {
      throw new ConvexError("Depot is not accepting requests");
    }
    const consumer = await ctx.db.get(args.consumerAccountId);
    if (!consumer) throw new ConvexError("Consumer not found");
    if (consumer.role !== "consumer") throw new ConvexError("This account is not a consumer");
    const user = await ctx.db
      .query("users")
      .withIndex("by_account", (q: any) => q.eq("accountId", consumer._id))
      .first();
    if (!user) throw new ConvexError("Consumer profile is not complete");
    if (user.cooldownUntil && user.cooldownUntil > Date.now()) {
      throw new ConvexError("This customer is still in their cooldown period");
    }
    const [allotted, activeHere] = await Promise.all([
      ctx.db
        .query("waitlistEntries")
        .withIndex("by_consumer_status", (q) =>
          q.eq("consumerAccountId", consumer._id).eq("status", "allotted"),
        )
        .collect(),
      ctx.db
        .query("waitlistEntries")
        .withIndex("by_consumer_status", (q) =>
          q.eq("consumerAccountId", consumer._id).eq("status", "waiting"),
        )
        .collect(),
    ]);
    if (allotted.length > 0) {
      throw new ConvexError("This customer already has gas allotted elsewhere");
    }
    if (activeHere.some((entry) => entry.dealerId === dealer._id)) {
      throw new ConvexError("This customer is already in your queue");
    }
    const entryId = await ctx.db.insert("waitlistEntries", {
      dealerId: dealer._id,
      consumerAccountId: consumer._id,
      cylinderSize: "14.2kg",
      quantity: 1,
      status: "waiting",
      createdAt: Date.now(),
    });
    await notify(
      ctx,
      consumer._id,
      "Added to waitlist",
      `The dealer added you to the queue at ${dealer.businessName}. Track your position in the app.`,
    );
    await auditLog(ctx, {
      actorAccountId: dealer.ownerAccountId,
      action: "waitlist:add-by-dealer",
      targetType: "waitlistEntry",
      targetId: String(entryId),
      details: String(consumer._id),
    });
    return entryId;
  },
});

export const allotEntry = mutation({
  args: { entryId: v.id("waitlistEntries"), sessionToken: v.optional(v.string()), ownerAccountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const dealer = await dealerFromTokenOrAccount(ctx, resolveActor(args));
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new ConvexError("Entry not found");
    if (entry.status !== "waiting") throw new ConvexError("Entry is not waiting");
    const actualDealer = dealer ?? (await ctx.db.get(entry.dealerId));
    if (!actualDealer || actualDealer._id !== entry.dealerId) throw new ConvexError("Not your depot");
    if (actualDealer.stock < entry.quantity) throw new ConvexError("Not enough stock");
    await ctx.db.patch(actualDealer._id, { stock: actualDealer.stock - entry.quantity });
    await allotOne(ctx, actualDealer, entry);
    return await ctx.db.get(entry._id);
  },
});

export const bulkAllot = mutation({
  args: {
    entryIds: v.array(v.id("waitlistEntries")),
    sessionToken: v.optional(v.string()),
    ownerAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dealer = await dealerFromTokenOrAccount(ctx, resolveActor(args));
    if (!dealer) throw new ConvexError("Not your depot");
    const ids = [...new Set(args.entryIds)];
    let stock = dealer.stock;
    let allotted = 0;
    let skipped = 0;
    for (const id of ids) {
      const entry = await ctx.db.get(id);
      if (!entry || entry.dealerId !== dealer._id || entry.status !== "waiting") {
        skipped += 1;
        continue;
      }
      if (stock < entry.quantity) {
        skipped += 1;
        continue;
      }
      stock -= entry.quantity;
      await allotOne(ctx, dealer, entry);
      allotted += 1;
    }
    await ctx.db.patch(dealer._id, { stock });
    return { allotted, skipped };
  },
});

export const autoAllotByStock = mutation({
  args: { sessionToken: v.optional(v.string()), ownerAccountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const dealer = await dealerFromTokenOrAccount(ctx, resolveActor(args));
    if (!dealer) throw new ConvexError("Not your depot");
    const waiting = (await ctx.db
      .query("waitlistEntries")
      .withIndex("by_dealer_status_created", (q) =>
        q.eq("dealerId", dealer._id).eq("status", "waiting"),
      )
      .collect()).sort((a, b) => a.createdAt - b.createdAt);
    let stock = dealer.stock;
    let allotted = 0;
    for (const entry of waiting) {
      if (stock < entry.quantity) break;
      stock -= entry.quantity;
      await allotOne(ctx, dealer, entry);
      allotted += 1;
    }
    await ctx.db.patch(dealer._id, { stock });
    return { allotted };
  },
});

async function completeCollection(
  ctx: { db: any },
  entry: Doc<"waitlistEntries">,
  dealer: Doc<"dealers">,
  actorAccountId: Id<"accounts">,
) {
  const consumer = await ctx.db
    .query("users")
    .withIndex("by_account", (q: any) => q.eq("accountId", entry.consumerAccountId))
    .first();
  const collectedAt = Date.now();
  await ctx.db.patch(entry._id, { status: "collected", collectedAt });
  if (consumer) {
    await ctx.db.patch(consumer._id, {
      totalPurchasedQuantity: (consumer.totalPurchasedQuantity ?? 0) + entry.quantity,
      lastCollectedAt: collectedAt,
      cooldownUntil: collectedAt + DEFAULT_COOLDOWN_MS,
      lastCollectedDealerId: dealer._id,
    });
  }
  await notify(
    ctx,
    entry.consumerAccountId,
    "Cylinder collected",
    `Your cylinder was handed over at ${dealer.businessName}.`,
  );
  await notify(
    ctx,
    dealer.ownerAccountId,
    "Handover confirmed",
    `${entry.quantity} x ${entry.cylinderSize} collected by customer at ${dealer.businessName}.`,
  );
  await auditLog(ctx, {
    actorAccountId,
    action: "waitlist:collect",
    targetType: "waitlistEntry",
    targetId: String(entry._id),
    details: String(entry.quantity),
  });
}

export const collectEntry = mutation({
  args: { entryId: v.id("waitlistEntries"), sessionToken: v.optional(v.string()), ownerAccountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const dealer = await dealerFromTokenOrAccount(ctx, resolveActor(args));
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new ConvexError("Entry not found");
    if (entry.status !== "allotted") throw new ConvexError("Cylinder is not allotted yet");
    const actualDealer = dealer ?? (await ctx.db.get(entry.dealerId));
    if (!actualDealer || actualDealer._id !== entry.dealerId) throw new ConvexError("Not your depot");
    await completeCollection(ctx, entry, actualDealer, actualDealer.ownerAccountId);
    return await ctx.db.get(entry._id);
  },
});

export const confirmCollection = mutation({
  args: {
    entryId: v.id("waitlistEntries"),
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const account = await accountByIdOrSession(ctx, resolveActor(args));
    if (!account) throw new ConvexError("Not signed in");
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new ConvexError("Entry not found");
    if (entry.consumerAccountId !== account._id) throw new ConvexError("This is not your request");
    if (entry.status !== "allotted") throw new ConvexError("Cylinder is not allotted yet");
    const dealer = await ctx.db.get(entry.dealerId);
    if (!dealer) throw new ConvexError("Depot not found");
    await completeCollection(ctx, entry, dealer, account._id);
    return await ctx.db.get(entry._id);
  },
});

export const cancelEntry = mutation({
  args: {
    entryId: v.id("waitlistEntries"),
    sessionToken: v.optional(v.string()),
    requesterAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await accountByIdOrSession(ctx, resolveActor(args));
    if (!requester) throw new ConvexError("Not signed in");
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new ConvexError("Entry not found");
    const dealer = await ctx.db.get(entry.dealerId);
    if (entry.consumerAccountId !== requester._id && dealer?.ownerAccountId !== requester._id) {
      throw new ConvexError("Not allowed");
    }
    if (!activeStatuses.has(entry.status)) throw new ConvexError("Cannot cancel this request");
    await ctx.db.patch(entry._id, { status: "cancelled" });
    if (entry.status === "allotted" && dealer) {
      await ctx.db.patch(dealer._id, { stock: dealer.stock + entry.quantity });
    }
    await notify(
      ctx,
      entry.consumerAccountId,
      "Request cancelled",
      dealer ? `Your request at ${dealer.businessName} was cancelled.` : undefined,
    );
    await auditLog(ctx, {
      actorAccountId: requester._id,
      action: "waitlist:cancel",
      targetType: "waitlistEntry",
      targetId: String(entry._id),
    });
    return await ctx.db.get(entry._id);
  },
});

export const setEntryStatusForSeed = mutation({
  args: { entryId: v.id("waitlistEntries"), status: entryStatus },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { status: args.status });
  },
});
