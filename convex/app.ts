import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { appRole } from "./schema";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function collectionCode() {
  return `GQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function dealerCode(name: string) {
  const stem = name.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6) || "DEPOT";
  return `${stem}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
}

function usernameBase(fullName: string) {
  return (
    fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.+/g, ".")
      .slice(0, 18) || "user"
  );
}

async function uniqueUsername(ctx: any, fullName: string) {
  const base = usernameBase(fullName);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base}.${suffix}`;
    const taken = (await userByUsername(ctx, candidate)) || (await dealerProfileByUsername(ctx, candidate));
    if (!taken) return candidate;
  }
  return `${base}.${Math.random().toString(36).slice(2, 8)}`;
}

async function auditLog(
  ctx: any,
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

async function dealerByOwner(ctx: any, accountId: Id<"accounts">) {
  return await ctx.db
    .query("dealers")
    .withIndex("by_owner", (q: any) => q.eq("ownerAccountId", accountId))
    .first();
}

async function userByAccount(ctx: any, accountId: Id<"accounts">) {
  return await ctx.db
    .query("users")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .first();
}

async function dealerProfileByAccount(ctx: any, accountId: Id<"accounts">) {
  return await ctx.db
    .query("dealerProfiles")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .first();
}

async function sessionByToken(ctx: any, token: string) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
}

async function accountFromSessionToken(ctx: any, token?: string) {
  if (!token) return null;
  const session = await sessionByToken(ctx, token);
  if (!session) return null;
  const account = await ctx.db.get(session.accountId);
  if (!account) return null;
  return { session, account };
}

function resolveSessionToken(args: { sessionToken?: string; accountId?: string }) {
  return args.sessionToken ?? args.accountId;
}

async function createSession(ctx: any, accountId: Id<"accounts">) {
  const token = randomToken();
  await ctx.db.insert("sessions", {
    token,
    accountId,
    createdAt: Date.now(),
  });
  return token;
}

async function userByUsername(ctx: any, username: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_username", (q: any) => q.eq("username", username))
    .first();
}

async function dealerProfileByUsername(ctx: any, username: string) {
  return await ctx.db
    .query("dealerProfiles")
    .withIndex("by_username", (q: any) => q.eq("username", username))
    .first();
}

async function userByCitizenshipNo(ctx: any, citizenshipNo: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_citizenship_no", (q: any) => q.eq("citizenshipNo", citizenshipNo))
    .first();
}

async function assertUniqueCitizenshipNo(
  ctx: any,
  accountId?: Id<"accounts">,
  citizenshipNo?: string,
) {
  const normalized = citizenshipNo?.trim();
  if (!normalized) return;
  const existing = await userByCitizenshipNo(ctx, normalized);
  if (existing && (!accountId || existing.accountId !== accountId)) {
    throw new ConvexError("That citizenship number is already in use");
  }
}

async function upsertUserFields(
  ctx: any,
  accountId: Id<"accounts">,
  fields: {
    fullName?: string;
    citizenshipNo?: string;
    address?: string;
    district?: string;
    phone?: string;
    collectionCode?: string;
  },
) {
  const patch: Record<string, unknown> = {};
  if (fields.fullName !== undefined) patch.fullName = fields.fullName.trim() || undefined;
  if (fields.citizenshipNo !== undefined) patch.citizenshipNo = fields.citizenshipNo.trim() || undefined;
  if (fields.address !== undefined) patch.address = fields.address.trim() || undefined;
  if (fields.district !== undefined) patch.district = fields.district.trim() || undefined;
  if (fields.phone !== undefined) patch.phone = fields.phone.trim() || undefined;
  if (fields.collectionCode !== undefined) patch.collectionCode = fields.collectionCode;
  if (fields.citizenshipNo !== undefined) {
    const normalizedCitizenship = fields.citizenshipNo.trim() || undefined;
    await assertUniqueCitizenshipNo(ctx, accountId, normalizedCitizenship);
    patch.citizenshipNo = normalizedCitizenship;
  }
  const existing = await userByAccount(ctx, accountId);
  if (!existing) {
    const fullName = typeof patch.fullName === "string" ? patch.fullName : "";
    const userCollectionCode =
      typeof patch.collectionCode === "string" ? patch.collectionCode : collectionCode();
    if (!fullName) throw new ConvexError("Missing profile details");
    const username = await uniqueUsername(ctx, fullName);
    await ctx.db.insert("users", {
      accountId,
      fullName,
      username,
      citizenshipNo: typeof patch.citizenshipNo === "string" ? patch.citizenshipNo : undefined,
      address: typeof patch.address === "string" ? patch.address : undefined,
      district: typeof patch.district === "string" ? patch.district : undefined,
      phone: typeof patch.phone === "string" ? patch.phone : undefined,
      collectionCode: userCollectionCode,
      totalPurchasedQuantity: 0,
      createdAt: Date.now(),
    });
    return;
  }
  await ctx.db.patch(existing._id, patch);
}

async function upsertDealerProfileFields(
  ctx: any,
  accountId: Id<"accounts">,
  fields: {
    fullName?: string;
    address?: string;
    district?: string;
    phone?: string;
  },
) {
  const patch: Record<string, unknown> = {};
  if (fields.fullName !== undefined) patch.fullName = fields.fullName.trim() || undefined;
  if (fields.address !== undefined) patch.address = fields.address.trim() || undefined;
  if (fields.district !== undefined) patch.district = fields.district.trim() || undefined;
  if (fields.phone !== undefined) patch.phone = fields.phone.trim() || undefined;
  const existing = await dealerProfileByAccount(ctx, accountId);
  if (!existing) {
    const fullName = typeof patch.fullName === "string" ? patch.fullName : "";
    if (!fullName) throw new ConvexError("Missing profile details");
    const username = await uniqueUsername(ctx, fullName);
    await ctx.db.insert("dealerProfiles", {
      accountId,
      fullName,
      username,
      address: typeof patch.address === "string" ? patch.address : undefined,
      district: typeof patch.district === "string" ? patch.district : undefined,
      phone: typeof patch.phone === "string" ? patch.phone : undefined,
      createdAt: Date.now(),
    });
    return;
  }
  await ctx.db.patch(existing._id, patch);
}

async function createAccount(
  ctx: any,
  args: {
    email: string;
    password: string;
    role: "consumer" | "dealer";
    fullName?: string;
    citizenshipNo?: string;
    address?: string;
    district?: string;
    phone?: string;
    collectionCode?: string;
  },
) {
  const email = normalizeEmail(args.email);
  const existing = await ctx.db
    .query("accounts")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (existing) throw new ConvexError("An account with that email already exists");
  await assertUniqueCitizenshipNo(ctx, undefined, args.citizenshipNo);
  const hashedPassword = await hashPassword(args.password);
  const accountId = await ctx.db.insert("accounts", {
    email,
    password: hashedPassword,
    role: args.role,
    createdAt: Date.now(),
  });
  const username = await uniqueUsername(ctx, args.fullName?.trim() || "User");
  if (args.role === "dealer") {
    await ctx.db.insert("dealerProfiles", {
      accountId,
      fullName: args.fullName?.trim() || "",
      username,
      address: args.address?.trim() || undefined,
      district: args.district?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      createdAt: Date.now(),
    });
    await ctx.db.insert("dealers", {
      ownerAccountId: accountId,
      businessName: args.fullName?.trim() || "Dealer",
      district: args.district?.trim() || "Other",
      address: args.address?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      stock: 0,
      code: dealerCode(args.fullName?.trim() || "Dealer"),
      isActive: false,
      approvalStatus: "pending",
      requestedAt: Date.now(),
    });
  } else {
    await ctx.db.insert("users", {
      accountId,
      fullName: args.fullName?.trim() || "",
      username,
      citizenshipNo: args.citizenshipNo?.trim() || undefined,
      address: args.address?.trim() || undefined,
      district: args.district?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      collectionCode: args.collectionCode ?? collectionCode(),
      totalPurchasedQuantity: 0,
      createdAt: Date.now(),
    });
  }
  await auditLog(ctx, { actorAccountId: accountId, action: "account:create", targetType: "account", targetId: String(accountId), details: args.role });
  return await createSession(ctx, accountId);
}

async function demoCitizenshipNo(
  ctx: any,
  requested: string | undefined,
  accountId?: Id<"accounts">,
) {
  const normalized = requested?.trim();
  if (!normalized) return undefined;
  const existing = await userByCitizenshipNo(ctx, normalized);
  if (!existing || (accountId && existing.accountId === accountId)) {
    return normalized;
  }
  return `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("consumer"), v.literal("dealer")),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.password.length < 8) throw new ConvexError("Use at least 8 characters");
    return await createAccount(ctx, args);
  },
});

export const signIn = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_email", (q: any) => q.eq("email", normalizeEmail(args.email)))
      .first();
    if (!account) {
      throw new ConvexError("Unable to sign in");
    }
    const looksHashed = account.password.startsWith("pbkdf2$");
    if (looksHashed) {
      const valid = await verifyPassword(args.password, account.password);
      if (!valid) throw new ConvexError("Unable to sign in");
    } else {
      if (account.password !== args.password) throw new ConvexError("Unable to sign in");
      await ctx.db.patch(account._id, { password: await hashPassword(args.password) });
    }
    await auditLog(ctx, { actorAccountId: account._id, action: "account:signIn", targetType: "account", targetId: String(account._id) });
    return await createSession(ctx, account._id);
  },
});

export const viewer = query({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await accountFromSessionToken(ctx, resolveSessionToken(args));
    if (!session) return null;
    const user =
      session.account.role === "dealer"
        ? await dealerProfileByAccount(ctx, session.account._id)
        : await userByAccount(ctx, session.account._id);
    return {
      account: session.account,
      user,
      dealer: session.account.role === "dealer" ? await dealerByOwner(ctx, session.account._id) : null,
    };
  },
});

export const updateRole = mutation({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()), role: appRole },
  handler: async (ctx, args) => {
    const session = await accountFromSessionToken(ctx, resolveSessionToken(args));
    if (!session) throw new ConvexError("Not signed in");
    await ctx.db.patch(session.account._id, { role: args.role });
    await auditLog(ctx, { actorAccountId: session.account._id, action: "account:updateRole", targetType: "account", targetId: String(session.account._id), details: args.role });
  },
});

export const updateProfile = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    fullName: v.string(),
    citizenshipNo: v.optional(v.string()),
    address: v.optional(v.string()),
    district: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await accountFromSessionToken(ctx, resolveSessionToken(args));
    if (!session) throw new ConvexError("Not signed in");
    if (session.account.role === "dealer") {
      await upsertDealerProfileFields(ctx, session.account._id, {
        fullName: args.fullName,
        address: args.address,
        district: args.district,
        phone: args.phone,
      });
    } else {
      await upsertUserFields(ctx, session.account._id, {
        fullName: args.fullName,
        citizenshipNo: args.citizenshipNo,
        address: args.address,
        district: args.district,
        phone: args.phone,
      });
    }
    await auditLog(ctx, { actorAccountId: session.account._id, action: "account:updateProfile", targetType: "account", targetId: String(session.account._id) });
  },
});

export const upsertDealer = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    businessName: v.string(),
    licenseNo: v.optional(v.string()),
    district: v.string(),
    address: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await accountFromSessionToken(ctx, resolveSessionToken(args));
    if (!session) throw new ConvexError("Not signed in");
    await ctx.db.patch(session.account._id, { role: "dealer" });
    const existing = await dealerByOwner(ctx, session.account._id);
    const payload = {
      businessName: args.businessName.trim(),
      licenseNo: args.licenseNo?.trim() || undefined,
      district: args.district,
      address: args.address.trim(),
      phone: args.phone?.trim() || undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      await auditLog(ctx, { actorAccountId: session.account._id, action: "dealer:updateProfile", targetType: "dealer", targetId: String(existing._id) });
      return existing._id;
    }
    const dealerId = await ctx.db.insert("dealers", {
      ownerAccountId: session.account._id,
      ...payload,
      stock: 0,
      code: dealerCode(args.businessName),
      isActive: true,
      approvalStatus: "approved",
      requestedAt: Date.now(),
    });
    await auditLog(ctx, { actorAccountId: session.account._id, action: "dealer:create", targetType: "dealer", targetId: String(dealerId) });
    return dealerId;
  },
});

export const updateDealerStock = mutation({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()), stock: v.number() },
  handler: async (ctx, args) => {
    const session = await accountFromSessionToken(ctx, resolveSessionToken(args));
    if (!session) throw new ConvexError("Not signed in");
    const dealer = await dealerByOwner(ctx, session.account._id);
    if (!dealer) throw new ConvexError("Depot not found");
    await ctx.db.patch(dealer._id, { stock: Math.max(0, Math.floor(args.stock)) });
    await auditLog(ctx, { actorAccountId: session.account._id, action: "dealer:updateStock", targetType: "dealer", targetId: String(dealer._id), details: String(Math.max(0, Math.floor(args.stock))) });
  },
});

export const updateDealerDetails = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    accountId: v.optional(v.string()),
    businessName: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await accountFromSessionToken(ctx, resolveSessionToken(args));
    if (!session) throw new ConvexError("Not signed in");
    const dealer = await dealerByOwner(ctx, session.account._id);
    if (!dealer) throw new ConvexError("Depot not found");
    await ctx.db.patch(dealer._id, {
      businessName: args.businessName.trim(),
      address: args.address?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
    });
    await auditLog(ctx, { actorAccountId: session.account._id, action: "dealer:updateDetails", targetType: "dealer", targetId: String(dealer._id) });
  },
});

export const toggleDealerActive = mutation({
  args: { sessionToken: v.optional(v.string()), accountId: v.optional(v.string()), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const session = await accountFromSessionToken(ctx, resolveSessionToken(args));
    if (!session) throw new ConvexError("Not signed in");
    const dealer = await dealerByOwner(ctx, session.account._id);
    if (!dealer) throw new ConvexError("Depot not found");
    await ctx.db.patch(dealer._id, { isActive: args.isActive });
    await auditLog(ctx, { actorAccountId: session.account._id, action: "dealer:toggleActive", targetType: "dealer", targetId: String(dealer._id), details: String(args.isActive) });
  },
});

export const accountByCollectionCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_collection_code", (q: any) => q.eq("collectionCode", args.code.trim().toUpperCase()))
      .first();
    return user?.accountId ?? null;
  },
});

async function ensureDemo(
  ctx: any,
  args: {
    email: string;
    password: string;
    role: "consumer" | "dealer";
    fullName: string;
    district: string;
    address: string;
    citizenshipNo?: string;
    businessName?: string;
    licenseNo?: string;
    stock?: number;
    code?: string;
  },
) {
  const email = normalizeEmail(args.email);
  const citizenshipNo = await demoCitizenshipNo(ctx, args.citizenshipNo);
  let account = await ctx.db
    .query("accounts")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (!account) {
    const token = await createAccount(ctx, { ...args, citizenshipNo });
    const session = await sessionByToken(ctx, token);
    account = session ? await ctx.db.get(session.accountId) : null;
  }
  if (!account) throw new ConvexError("Could not create demo account");
  if (args.role === "dealer") {
    const dealer = await dealerByOwner(ctx, account._id);
    await upsertDealerProfileFields(ctx, account._id, {
      fullName: args.fullName,
      district: args.district,
      address: args.address,
      phone: "9801000000",
    });
    const payload = {
      businessName: args.businessName ?? "Demo Gas Depot",
      licenseNo: args.licenseNo,
      district: args.district,
      address: args.address,
      phone: "9801000000",
      stock: args.stock ?? 30,
      code: args.code ?? "DEMO001",
      isActive: true,
      approvalStatus: "approved",
    };
    if (dealer) await ctx.db.patch(dealer._id, payload);
    else {
      const dealerId = await ctx.db.insert("dealers", {
        ownerAccountId: account._id,
        ...payload,
        requestedAt: Date.now(),
      });
      await auditLog(ctx, { actorAccountId: account._id, action: "dealer:createDemo", targetType: "dealer", targetId: String(dealerId) });
    }
  } else {
    await upsertUserFields(ctx, account._id, {
      fullName: args.fullName,
      district: args.district,
      address: args.address,
      citizenshipNo,
    });
  }
  return account._id;
}

export const ensureDemoAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const consumerId = await ensureDemo(ctx, {
      email: "demo.consumer@YoGas.app",
      password: "demo1234",
      role: "consumer",
      fullName: "Demo Consumer",
      district: "Kathmandu",
      address: "Chabahil, Kathmandu",
      citizenshipNo: "12-01-75-01234",
    });
    const dealerId = await ensureDemo(ctx, {
      email: "demo.dealer@YoGas.app",
      password: "demo1234",
      role: "dealer",
      fullName: "Demo Dealer",
      district: "Kathmandu",
      address: "Chabahil Chowk, Kathmandu",
      businessName: "Everest Demo Gas Depot",
      licenseNo: "LPG-DEMO-001",
      stock: 0,
      code: "EVEREST1",
    });
    return { consumerId, dealerId };
  },
});

async function hashPassword(password: string) {
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

async function verifyPassword(password: string, encoded: string) {
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
