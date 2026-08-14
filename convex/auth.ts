import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_MAX_ATTEMPTS = 10;
export const SIGNUP_MAX_PER_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SIGNUP_MAX_PER_EMAIL = 3;
export const SIGNUP_MAX_PER_DEVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SIGNUP_MAX_PER_DEVICE = 5;

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string) {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sessionByToken(ctx: { db: any }, token: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
}

export async function createSession(ctx: { db: any }, accountId: Id<"accounts">) {
  const token = randomToken();
  await ctx.db.insert("sessions", {
    token,
    accountId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export async function pruneExpiredForAccount(ctx: { db: any }, accountId: Id<"accounts">) {
  const rows = await ctx.db
    .query("sessions")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .collect();
  const now = Date.now();
  await Promise.all(
    rows
      .filter((row: { expiresAt?: number }) => !row.expiresAt || row.expiresAt < now)
      .map((row: { _id: any }) => ctx.db.delete(row._id)),
  );
}

/**
 * Resolve a caller strictly from a session token. Never accepts a raw
 * account id. Read-only: expired/orphaned sessions are rejected here but
 * only cleaned up by mutations (`pruneExpiredForAccount` on sign-in) and
 * the daily cleanup cron, because queries cannot write.
 */
export async function optionalSession(ctx: { db: any }, token?: string) {
  if (!token) return null;
  const session = await sessionByToken(ctx, token);
  if (!session) return null;
  if (!session.expiresAt || session.expiresAt < Date.now()) return null;
  const account = await ctx.db.get(session.accountId);
  if (!account) return null;
  return { session, account };
}

export async function requireSession(ctx: { db: any }, token?: string) {
  const resolved = await optionalSession(ctx, token);
  if (!resolved) throw new ConvexError("Not signed in");
  return resolved;
}

async function attemptRecord(ctx: { db: any }, key: string) {
  return await ctx.db
    .query("loginAttempts")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
}

async function bumpAttempt(ctx: { db: any }, key: string, now: number, windowMs: number) {
  const record = await attemptRecord(ctx, key);
  if (!record) {
    await ctx.db.insert("loginAttempts", {
      key,
      failures: 0,
      attemptCount: 1,
      windowStartedAt: now,
      lastAttemptAt: now,
    });
    return { attemptCount: 1, windowStartedAt: now };
  }
  const windowExpired = now - record.windowStartedAt >= windowMs;
  const nextCount = windowExpired ? 1 : record.attemptCount + 1;
  const nextWindow = windowExpired ? now : record.windowStartedAt;
  await ctx.db.patch(record._id, {
    attemptCount: nextCount,
    windowStartedAt: nextWindow,
    lastAttemptAt: now,
  });
  return { attemptCount: nextCount, windowStartedAt: nextWindow };
}

export async function clearAttempt(ctx: { db: any }, key: string) {
  const record = await attemptRecord(ctx, key);
  if (record) await ctx.db.delete(record._id);
}

function lockMessage(lockedUntil: number) {
  const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
  return `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

/** Gate an action behind a per-key window; throws when the budget is spent. */
export async function throttleWindow(
  ctx: { db: any },
  key: string,
  maxAttempts: number,
  windowMs: number,
) {
  const now = Date.now();
  const record = await attemptRecord(ctx, key);
  if (record && record.lockedUntil && record.lockedUntil > now) {
    throw new ConvexError(lockMessage(record.lockedUntil));
  }
  const { attemptCount, windowStartedAt } = await bumpAttempt(ctx, key, now, windowMs);
  if (attemptCount > maxAttempts) {
    await ctx.db.patch(
      (await attemptRecord(ctx, key))!._id,
      { lockedUntil: windowStartedAt + windowMs },
    );
    throw new ConvexError("Too many attempts. Please try again later.");
  }
}

/** Register a failed sign-in for a key; locks the key after N failures. */
export async function recordLoginFailure(ctx: { db: any }, key: string) {
  const now = Date.now();
  const record = await attemptRecord(ctx, key);
  if (!record) {
    await ctx.db.insert("loginAttempts", {
      key,
      failures: 1,
      attemptCount: 1,
      windowStartedAt: now,
      lastAttemptAt: now,
    });
    return;
  }
  const failures = record.failures + 1;
  await ctx.db.patch(record._id, {
    failures,
    lastAttemptAt: now,
    ...(failures >= LOGIN_MAX_FAILURES
      ? { lockedUntil: now + LOGIN_WINDOW_MS, failures: 0 }
      : {}),
  });
}

export async function hashPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const imported = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 120000,
    },
    imported,
    256,
  );
  return `pbkdf2$120000$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [scheme, iterationsText, saltHex, hashHex] = encoded.split("$");
  if (scheme !== "pbkdf2" || !iterationsText || !saltHex || !hashHex) return false;
  const iterations = Number.parseInt(iterationsText, 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const imported = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex),
      iterations,
    },
    imported,
    256,
  );
  return bytesToHex(new Uint8Array(bits)) === hashHex;
}

/** Mask a citizenship number down to a tail, mirroring the client helper. */
export function maskCitizenshipTail(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "•".repeat(trimmed.length);
  return "•".repeat(Math.max(2, trimmed.length - 4)) + trimmed.slice(-4);
}

export const isDemoSeedEnabled = () => process.env["ALLOW_DEMO_SEED"] === "true";
