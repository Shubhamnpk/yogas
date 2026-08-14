import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSession } from "./auth";

export const list = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await optionalSession(ctx, args.sessionToken);
    if (!session) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_account_created", (q) => q.eq("accountId", session.account._id))
      .order("desc")
      .take(60);
  },
});

export const unreadCount = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await optionalSession(ctx, args.sessionToken);
    if (!session) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_account_created", (q) => q.eq("accountId", session.account._id))
      .collect();
    return rows.filter((row) => !row.read).length;
  },
});

export const markAllRead = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await optionalSession(ctx, args.sessionToken);
    if (!session) return;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_account_created", (q) => q.eq("accountId", session.account._id))
      .collect();
    await Promise.all(rows.filter((row) => !row.read).map((row) => ctx.db.patch(row._id, { read: true })));
  },
});