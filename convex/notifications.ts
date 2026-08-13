import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) =>
    {
      const token = args.sessionToken ?? args.accountId;
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", token ?? ""))
        .first();
      if (!session) return [];
      return await ctx.db
      .query("notifications")
        .withIndex("by_account_created", (q) => q.eq("accountId", session.accountId))
        .order("desc")
        .take(60);
    },
});

export const unreadCount = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const token = args.sessionToken ?? args.accountId;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token ?? ""))
      .first();
    if (!session) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_account_created", (q) => q.eq("accountId", session.accountId))
      .collect();
    return rows.filter((row) => !row.read).length;
  },
});

export const markAllRead = mutation({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const token = args.sessionToken ?? args.accountId;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token ?? ""))
      .first();
    if (!session) return;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_account_created", (q) => q.eq("accountId", session.accountId))
      .collect();
    await Promise.all(rows.filter((row) => !row.read).map((row) => ctx.db.patch(row._id, { read: true })));
  },
});
