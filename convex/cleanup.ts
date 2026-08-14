import { internalMutation } from "./_generated/server";

const NOTIFICATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const LOGIN_ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Scheduled housekeeping: deletes expired sessions, old read notifications
 * and stale login-attempt records. Runs daily via convex/crons.ts.
 */
export const runDailyCleanup = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    let sessions = 0;
    let notifications = 0;
    let loginAttempts = 0;

    const expiredSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
    await Promise.all(
      expiredSessions.map((s) => {
        sessions += 1;
        return ctx.db.delete(s._id);
      }),
    );

    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_created", (q) => q.lt("createdAt", now - NOTIFICATION_RETENTION_MS))
      .filter((q) => q.eq(q.field("read"), true))
      .collect();
    await Promise.all(
      oldNotifications.map((n) => {
        notifications += 1;
        return ctx.db.delete(n._id);
      }),
    );

    const staleAttempts = await ctx.db
      .query("loginAttempts")
      .withIndex("by_last_attempt", (q) => q.lt("lastAttemptAt", now - LOGIN_ATTEMPT_RETENTION_MS))
      .collect();
    await Promise.all(
      staleAttempts.map((a) => {
        loginAttempts += 1;
        return ctx.db.delete(a._id);
      }),
    );

    return { sessions, notifications, loginAttempts };
  },
});
