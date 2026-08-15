# YoGas — security audit, re-evaluated

Re-read of the current backend (`convex/auth.ts`, `app.ts`, `waitlist.ts`, `admin.ts`, `cleanup.ts`, `schema.ts`, `crons.ts`) and `src/lib/auth.tsx`. The previous audit is now out of date: every critical item in it has been fixed.

## Previously critical — verified fixed

- **Impersonation via account id** — gone. `optionalSession`/`requireSession` in `convex/auth.ts` resolve callers from the session token only, check expiry, and are used by every function that touches user data. No `db.get(accountId)` fallback remains.
- **Anyone could allot/collect** — gone. `allotEntry`, `bulkAllot`, `autoAllotByStock`, `collectEntry` resolve the depot from the caller's session (`dealerFromSession`) and then require `dealer._id === entry.dealerId`. No self-satisfying fallback.
- **Anyone could become admin** — gone. `admin.ensureAdminAccount` throws unless `ALLOW_DEMO_SEED=true`; plaintext passwords are rejected at sign-in (`account.password.startsWith("pbkdf2$")`); `app.updateRole` accepts only consumer/dealer, and elevation lives behind `admin.setUserRole` + `requireAdmin`.
- **Consumer PII leak** — gone. Dealer-scan queries require a dealer session that owns the depot, and citizenship numbers come back masked via `maskCitizenshipTail`.
- **Self-approving depots** — gone. Both `createAccount` and `upsertDealer` insert depots as `isActive: false`, `approvalStatus: "pending"`.
- **Sessions immortal** — fixed. 30-day `expiresAt`, server-side `signOut` deletes the row, sign-in prunes expired rows, a daily cron cleans sessions/notifications/login attempts, and the client drops the token when `viewer` returns null.
- **No rate limiting** — fixed. Per-email and per-device throttling on sign-in and sign-up, lockout after repeated failures, generic "Unable to sign in" (no account enumeration on sign-in).
- **`setEntryStatusForSeed`** — removed.

Current posture: no known critical or high-severity holes. Remaining items are medium and low.

## Findings that are still open

**Medium**

1. **Unapproved depots can still operate their queue.** `dealerFromSession` returns the depot regardless of `approvalStatus`/`isActive`. `addConsumerToQueue` checks approval, but `allotEntry`, `bulkAllot`, `autoAllotByStock`, `collectEntry` and the dealer read queries do not. A pending or revoked depot can allot and hand over stock. Fix: enforce approved+active inside `dealerFromSession` (with an explicit read-only variant for the dealer's own pending dashboard).
2. **Device-based rate limiting is client-supplied.** `deviceId` comes from `localStorage` and can be regenerated per request, so only the per-email limit really binds; there is no IP dimension. Fix: move sign-in/sign-up behind a Convex HTTP action so the real client IP can be keyed, keeping the email key as-is.
3. **No credential lifecycle.** There is no change-password, password-reset, or email-verification flow, and nothing invalidates other sessions when credentials change. Anyone with a stolen token keeps it for 30 days.
4. **Session token lives in `localStorage`.** Readable by any XSS. Mitigations available without a rewrite: shorten idle TTL with sliding renewal, rotate the token on sign-in, and record `lastSeenAt` so stale sessions expire sooner.

**Low**

5. `signUp` returns "An account with that email already exists" — account enumeration on the sign-up path only.
6. `listDealers` / `dealerByCode` return the whole depot document (owner account id, licence number, phone) to unauthenticated callers. Should project only the public fields.
7. Sign-in timing differs between "no such account" and "wrong password" (hash only runs in the second case) — a timing oracle for enumeration.
8. `role` is switchable between consumer and dealer at will by the account holder; a dealer with an approved depot can flip to consumer and back. Worth pinning once a depot exists.
9. `ALLOW_DEMO_SEED` gates the demo/admin seeding, but `src/routes/auth.tsx` still calls `ensureAdminAccount` from the browser; confirm the flag is off in the deployed environment, otherwise `admin@YoGas.app` / `admin1234` is live.

## Non-security correctness notes from the same pass

- Stock accounting is consistent: allot decrements, cancel-while-allotted restores, collect leaves the count alone.
- Allotting cancels the consumer's other waiting entries, matching the one-active-request rule; those cancellations do not currently notify the consumer per depot (only the allot notice is sent).
- Audit logging covers account, dealer and waitlist actions.

## Suggested order of work (if you want it fixed in one pass)

1. Approval gate inside `dealerFromSession` (finding 1).
2. Public field projection for depot queries (6).
3. Sign-up enumeration + constant-time sign-in path (5, 7).
4. Role pinning once a depot exists (8) and demo-seed flag confirmation (9).
5. Larger, separate: IP-keyed throttling via HTTP action (2) and the credential lifecycle — change password, reset, session revocation on change (3, 4).

Say which of these you want and I will plan the implementation in detail.
