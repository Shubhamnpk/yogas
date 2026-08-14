import { describe, expect, it } from "vitest";
import { makeTest, api } from "./helpers";

describe("runDailyCleanup", () => {
  it("deletes expired sessions, old read notifications and stale login attempts", async () => {
    const t = makeTest();
    const now = Date.now();
    const accountId = await t.run(async (ctx) => {
      return await ctx.db.insert("accounts", {
        email: "cleanup@example.com",
        password: "pbkdf2$1$x$x",
        role: "consumer",
        createdAt: now,
      });
    });

    // Sessions: one expired, one fresh.
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        token: "expired-session",
        accountId,
        createdAt: now - 40 * 24 * 60 * 60 * 1000,
        expiresAt: now - 1000,
      });
      await ctx.db.insert("sessions", {
        token: "fresh-session",
        accountId,
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000,
      });
    });

    // Notifications: old read (deleted), old unread (kept), fresh read (kept).
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        accountId,
        title: "old read",
        read: true,
        createdAt: now - 100 * 24 * 60 * 60 * 1000,
      });
      await ctx.db.insert("notifications", {
        accountId,
        title: "old unread",
        read: false,
        createdAt: now - 100 * 24 * 60 * 60 * 1000,
      });
      await ctx.db.insert("notifications", {
        accountId,
        title: "fresh read",
        read: true,
        createdAt: now - 1000,
      });
    });

    // Login attempts: one stale, one recent.
    await t.run(async (ctx) => {
      await ctx.db.insert("loginAttempts", {
        key: "stale",
        failures: 1,
        attemptCount: 1,
        windowStartedAt: now - 3 * 24 * 60 * 60 * 1000,
        lastAttemptAt: now - 3 * 24 * 60 * 60 * 1000,
      });
      await ctx.db.insert("loginAttempts", {
        key: "recent",
        failures: 1,
        attemptCount: 1,
        windowStartedAt: now - 1000,
        lastAttemptAt: now - 1000,
      });
    });

    const result = await t.mutation(api.cleanup.runDailyCleanup, {});

    expect(result).toEqual({ sessions: 1, notifications: 1, loginAttempts: 1 });

    const remaining = await t.run(async (ctx) => {
      const sessions = await ctx.db.query("sessions").collect();
      const notifications = await ctx.db.query("notifications").collect();
      const attempts = await ctx.db.query("loginAttempts").collect();
      return {
        sessionTokens: sessions.map((s) => s.token).sort(),
        notificationTitles: notifications.map((n) => n.title).sort(),
        attemptKeys: attempts.map((a) => a.key).sort(),
      };
    });

    expect(remaining.sessionTokens).toEqual(["fresh-session"]);
    expect(remaining.notificationTitles).toEqual(["fresh read", "old unread"]);
    expect(remaining.attemptKeys).toEqual(["recent"]);
  });
});
