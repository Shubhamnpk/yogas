import { describe, expect, it } from "vitest";
import { makeTest, api } from "./helpers";

async function seedAdmin(t: ReturnType<typeof makeTest>, email = "admin@example.com") {
  const accountId = await t.run(async (ctx) => {
    return await ctx.db.insert("accounts", {
      email,
      password: "pbkdf2$1$x$x",
      role: "admin",
      createdAt: Date.now(),
    });
  });
  const token = await t.run(async (ctx) => {
    const token = "admin-session-" + email;
    await ctx.db.insert("sessions", {
      token,
      accountId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    });
    return token;
  });
  return { accountId, token };
}

describe("admin queries", () => {
  it("rejects a non-admin caller", async () => {
    const t = makeTest();
    const result = await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    await expect(
      t.query(api.admin.listDealers, {
        sessionToken: (result as any).sessionToken,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("lists dealers with pagination and count", async () => {
    const t = makeTest();
    const admin = await seedAdmin(t);
    // Seed two dealers via sign-up so they have proper profiles.
    for (const [email, name] of [
      ["dealer1@example.com", "Depot One"],
      ["dealer2@example.com", "Depot Two"],
    ]) {
      await t.mutation(api.app.signUp, {
        email,
        password: "password123",
        role: "dealer",
        fullName: name,
      });
    }
    const first = await t.query(api.admin.listDealers, {
      sessionToken: admin.token,
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(first.page).toHaveLength(1);
    expect(first.count).toBe(2);
    expect(first.isDone).toBe(false);
    expect(first.continueCursor).toBeTruthy();
    const second = await t.query(api.admin.listDealers, {
      sessionToken: admin.token,
      paginationOpts: { numItems: 10, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(1);
    expect(second.isDone).toBe(true);
    expect(second.count).toBe(2);
  });

  it("filters dealers by status", async () => {
    const t = makeTest();
    const admin = await seedAdmin(t);
    await t.mutation(api.app.signUp, {
      email: "dealer1@example.com",
      password: "password123",
      role: "dealer",
      fullName: "Depot One",
    });
    await t.mutation(api.app.signUp, {
      email: "dealer2@example.com",
      password: "password123",
      role: "dealer",
      fullName: "Depot Two",
    });
    const pending = await t.query(api.admin.listDealers, {
      sessionToken: admin.token,
      status: "pending",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(pending.count).toBe(2);
    expect(pending.page.every((d: any) => d.approvalStatus === "pending")).toBe(true);
  });

  it("exposes owner email without leaking account passwords", async () => {
    const t = makeTest();
    const admin = await seedAdmin(t);
    await t.mutation(api.app.signUp, {
      email: "dealer1@example.com",
      password: "password123",
      role: "dealer",
      fullName: "Depot One",
    });
    const res = await t.query(api.admin.listDealers, {
      sessionToken: admin.token,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(res.page[0].ownerEmail).toBe("dealer1@example.com");
    expect(JSON.stringify(res)).not.toContain("password");
    expect(JSON.stringify(res)).not.toContain("pbkdf2");
  });
});
