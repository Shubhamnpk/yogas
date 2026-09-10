import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeEmail, optionalSession, throttleWindow } from "./auth";

const CONTACT_MAX_PER_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000;
const CONTACT_MAX_PER_EMAIL = 3;
const CONTACT_MAX_PER_DEVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const CONTACT_MAX_PER_DEVICE = 5;

const contactTopic = v.union(
  v.literal("general"),
  v.literal("depot"),
  v.literal("quota"),
  v.literal("bug"),
);

const contactStatus = v.union(
  v.literal("new"),
  v.literal("read"),
  v.literal("replied"),
  v.literal("archived"),
);

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

export const submitContactMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    topic: contactTopic,
    subject: v.optional(v.string()),
    message: v.string(),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, 120);
    const email = normalizeEmail(args.email);
    const subject = args.subject?.trim().slice(0, 200) || undefined;
    const message = args.message.trim().slice(0, 4000);
    if (!name || !email || !message) {
      throw new ConvexError("Please fill in all required fields.");
    }
    if (args.deviceId) {
      await throttleWindow(
        ctx,
        `contact-device:${args.deviceId}`,
        CONTACT_MAX_PER_DEVICE,
        CONTACT_MAX_PER_DEVICE_WINDOW_MS,
      );
    }
    await throttleWindow(
      ctx,
      `contact-email:${email}`,
      CONTACT_MAX_PER_EMAIL,
      CONTACT_MAX_PER_EMAIL_WINDOW_MS,
    );
    await ctx.db.insert("contactMessages", {
      name,
      email,
      topic: args.topic,
      ...(subject ? { subject } : {}),
      message,
      status: "new",
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const contactStats = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const [total, newCount] = await Promise.all([
      ctx.db.query("contactMessages").collect(),
      ctx.db
        .query("contactMessages")
        .withIndex("by_status_created", (q) => q.eq("status", "new"))
        .collect(),
    ]);
    return { total: total.length, new: newCount.length };
  },
});

export const listContactMessages = query({
  args: {
    sessionToken: v.optional(v.string()),
    status: v.optional(contactStatus),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const base = args.status
      ? ctx.db
          .query("contactMessages")
          .withIndex("by_status_created", (q) => q.eq("status", args.status!))
          .order("desc")
      : ctx.db.query("contactMessages").order("desc");
    return await base.paginate(args.paginationOpts);
  },
});

export const updateContactStatus = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    messageId: v.id("contactMessages"),
    status: contactStatus,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError("Message not found");
    await ctx.db.patch(args.messageId, { status: args.status });
    return true;
  },
});
