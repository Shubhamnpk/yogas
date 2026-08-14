import { describe, expect, it } from "vitest";
import { makeTest, api } from "./helpers";

async function seedDealerAccount(t: ReturnType<typeof makeTest>, email: string, fullName: string) {
  const result = await t.mutation(api.app.signUp, {
    email,
    password: "password123",
    role: "dealer",
    fullName,
  });
  const token = (result as any).sessionToken as string;
  const account = await t.run(async (ctx) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
  });
  const dealer = await t.run(async (ctx) => {
    return await ctx.db
      .query("dealers")
      .withIndex("by_owner", (q: any) => q.eq("ownerAccountId", account!._id))
      .first();
  });
  return { token, accountId: account!._id, dealerId: dealer!._id };
}

async function seedConsumerAccount(t: ReturnType<typeof makeTest>, email: string, fullName: string) {
  const result = await t.mutation(api.app.signUp, {
    email,
    password: "password123",
    role: "consumer",
    fullName,
  });
  const token = (result as any).sessionToken as string;
  const account = await t.run(async (ctx) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
  });
  return { token, accountId: account!._id };
}

async function insertEntry(
  t: ReturnType<typeof makeTest>,
  dealerId: any,
  consumerAccountId: any,
  status: string,
  createdAt: number,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("waitlistEntries", {
      dealerId,
      consumerAccountId,
      cylinderSize: "14.2kg",
      quantity: 1,
      status,
      createdAt,
    });
  });
}

describe("waitlist ownership", () => {
  it("allotEntry rejects a dealer who does not own the entry", async () => {
    const t = makeTest();
    const owner = await seedDealerAccount(t, "owner@example.com", "Owner Depot");
    const intruder = await seedDealerAccount(t, "intruder@example.com", "Intruder Depot");
    const consumer = await seedConsumerAccount(t, "consumer@example.com", "Test Consumer");
    const entryId = await insertEntry(t, owner.dealerId, consumer.accountId, "waiting", Date.now());
    await t.run(async (ctx) => {
      await ctx.db.patch(owner.dealerId, { stock: 10, isActive: true, approvalStatus: "approved" });
      await ctx.db.patch(intruder.dealerId, { stock: 0, isActive: true, approvalStatus: "approved" });
    });
    await expect(
      t.mutation(api.waitlist.allotEntry, {
        entryId,
        sessionToken: intruder.token,
      }),
    ).rejects.toThrow("Not your depot");
  });

  it("collectEntry rejects a dealer who does not own the entry", async () => {
    const t = makeTest();
    const owner = await seedDealerAccount(t, "owner@example.com", "Owner Depot");
    const intruder = await seedDealerAccount(t, "intruder@example.com", "Intruder Depot");
    const consumer = await seedConsumerAccount(t, "consumer@example.com", "Test Consumer");
    const entryId = await insertEntry(t, owner.dealerId, consumer.accountId, "allotted", Date.now());
    await expect(
      t.mutation(api.waitlist.collectEntry, {
        entryId,
        sessionToken: intruder.token,
      }),
    ).rejects.toThrow("Not your depot");
  });

  it("owner can allot and collect their own entry", async () => {
    const t = makeTest();
    const owner = await seedDealerAccount(t, "owner@example.com", "Owner Depot");
    await t.run(async (ctx) => {
      await ctx.db.patch(owner.dealerId, { stock: 10, isActive: true, approvalStatus: "approved" });
    });
    const consumer = await seedConsumerAccount(t, "consumer@example.com", "Test Consumer");
    const entryId = await t.mutation(api.waitlist.joinDepot, {
      dealerId: owner.dealerId,
      sessionToken: consumer.token,
      quantity: 1,
      cylinderSize: "14.2kg",
    });
    const allotted = await t.mutation(api.waitlist.allotEntry, {
      entryId,
      sessionToken: owner.token,
    });
    expect(allotted?.status).toBe("allotted");
    const collected = await t.mutation(api.waitlist.collectEntry, {
      entryId,
      sessionToken: owner.token,
    });
    expect(collected?.status).toBe("collected");
  });
});

describe("waitlist PII masking", () => {
  it("dealerQueue masks citizenship numbers", async () => {
    const t = makeTest();
    const owner = await seedDealerAccount(t, "owner@example.com", "Owner Depot");
    await t.run(async (ctx) => {
      await ctx.db.patch(owner.dealerId, { stock: 10, isActive: true, approvalStatus: "approved" });
    });
    const consumer = await seedConsumerAccount(t, "consumer@example.com", "Test Consumer");
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_account", (q: any) => q.eq("accountId", consumer.accountId))
        .first();
      await ctx.db.patch(user!._id, { citizenshipNo: "1234567890" });
    });
    await t.mutation(api.waitlist.joinDepot, {
      dealerId: owner.dealerId,
      sessionToken: consumer.token,
      quantity: 1,
      cylinderSize: "14.2kg",
    });
    const page = await t.query(api.waitlist.dealerQueue, {
      sessionToken: owner.token,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    const summary = page.page[0].consumer;
    expect(summary.citizenshipMasked).toBe("••••••7890");
    expect(JSON.stringify(page.page)).not.toContain("1234567890");
  });
});

describe("dealerQueue pagination", () => {
  it("paginates and reports isDone / continueCursor", async () => {
    const t = makeTest();
    const owner = await seedDealerAccount(t, "owner@example.com", "Owner Depot");
    const consumer = await seedConsumerAccount(t, "consumer@example.com", "Test Consumer");
    // Insert 3 entries with distinct createdAt values for deterministic ordering.
    const base = Date.now() - 1000 * 60 * 60;
    for (let i = 0; i < 3; i++) {
      await insertEntry(
        t,
        owner.dealerId,
        consumer.accountId,
        i === 2 ? "allotted" : "waiting",
        base + i,
      );
    }
    const first = await t.query(api.waitlist.dealerQueue, {
      sessionToken: owner.token,
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);
    expect(first.continueCursor).toBeTruthy();
    const second = await t.query(api.waitlist.dealerQueue, {
      sessionToken: owner.token,
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(1);
    expect(second.isDone).toBe(true);
  });

  it("filters by status when provided", async () => {
    const t = makeTest();
    const owner = await seedDealerAccount(t, "owner@example.com", "Owner Depot");
    const consumer = await seedConsumerAccount(t, "consumer@example.com", "Test Consumer");
    const base = Date.now() - 1000 * 60 * 60;
    for (let i = 0; i < 3; i++) {
      await insertEntry(
        t,
        owner.dealerId,
        consumer.accountId,
        i === 2 ? "allotted" : "waiting",
        base + i,
      );
    }
    const waiting = await t.query(api.waitlist.dealerQueue, {
      sessionToken: owner.token,
      status: "waiting",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(waiting.page).toHaveLength(2);
    expect(waiting.page.every((e: any) => e.status === "waiting")).toBe(true);
    const counts = await t.query(api.waitlist.dealerCounts, {
      sessionToken: owner.token,
    });
    expect(counts.waiting).toBe(2);
    expect(counts.allotted).toBe(1);
  });
});
