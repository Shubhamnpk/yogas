import { describe, expect, it } from "vitest";
import { makeTest, api } from "./helpers";

describe("auth", () => {
  it("signUp creates a session and viewer resolves it", async () => {
    const t = makeTest();
    const result = await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    expect(result.ok).toBe(true);
    expect(typeof (result as any).sessionToken).toBe("string");
    const viewer = await t.query(api.app.viewer, {
      sessionToken: (result as any).sessionToken,
    });
    expect(viewer?.account.email).toBe("consumer@example.com");
    expect(viewer?.account.role).toBe("consumer");
  });

  it("rejects a raw account id as a session token", async () => {
    const t = makeTest();
    const result = await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    const viewer = await t.query(api.app.viewer, {
      sessionToken: (result as any).sessionToken,
    });
    expect(viewer).not.toBeNull();
    // Try to pass the raw account id instead of the session token.
    const spoofed = await t.query(api.app.viewer, {
      sessionToken: String(viewer!.account._id),
    });
    expect(spoofed).toBeNull();
  });

  it("signUp rejects duplicate email without throwing", async () => {
    const t = makeTest();
    const first = await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    expect(first.ok).toBe(true);
    const duplicate = await t.mutation(api.app.signUp, {
      email: "CONSUMER@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer 2",
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.message).toContain("could not create that account");
  });

  it("signIn succeeds with the correct password", async () => {
    const t = makeTest();
    await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    const result = await t.mutation(api.app.signIn, {
      email: "consumer@example.com",
      password: "password123",
    });
    expect(result.ok).toBe(true);
    const viewer = await t.query(api.app.viewer, {
      sessionToken: (result as any).sessionToken,
    });
    expect(viewer?.account.email).toBe("consumer@example.com");
  });

  it("signIn rejects the wrong password without throwing", async () => {
    const t = makeTest();
    await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    const result = await t.mutation(api.app.signIn, {
      email: "consumer@example.com",
      password: "wrong-password",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Unable to sign in");
  });

  it("locks the account after too many failed sign-ins", async () => {
    const t = makeTest();
    await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    for (let i = 0; i < 5; i++) {
      const result = await t.mutation(api.app.signIn, {
        email: "consumer@example.com",
        password: "wrong-password",
      });
      expect(result.ok).toBe(false);
    }
    // Even the correct password is now locked out.
    await expect(
      t.mutation(api.app.signIn, {
        email: "consumer@example.com",
        password: "password123",
      }),
    ).rejects.toThrow(/Too many attempts/);
  });

  it("signOut invalidates the session", async () => {
    const t = makeTest();
    const result = await t.mutation(api.app.signUp, {
      email: "consumer@example.com",
      password: "password123",
      role: "consumer",
      fullName: "Test Consumer",
    });
    await t.mutation(api.app.signOut, {
      sessionToken: (result as any).sessionToken,
    });
    const viewer = await t.query(api.app.viewer, {
      sessionToken: (result as any).sessionToken,
    });
    expect(viewer).toBeNull();
  });
});
