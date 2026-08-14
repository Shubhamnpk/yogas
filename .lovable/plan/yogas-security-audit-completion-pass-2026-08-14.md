# YoGas — security audit + completion pass

## Where the app stands

Working today: email/password accounts with roles (consumer / dealer / admin), onboarding, depot search with district default, join-by-QR or code, one active request per person, dealer queue with allot / bulk allot / auto-allot / collect / cancel, dealer scan with manual collection-code fallback, cooldown after collection, notifications, admin console with dealer approval and audit logs, profile page and floating QR.

## Security audit — how secure is it right now

Honest answer: the UI is in good shape, the backend authorization is not. The backend accepts a raw database id as proof of identity in most functions, so several severe holes are live. Verified by reading `convex/app.ts`, `convex/waitlist.ts`, `convex/admin.ts`.

Critical

1. **Impersonation via account id.** Every waitlist function resolves the caller with a helper that first tries the session token and then falls back to `db.get(value)` on a raw account id. Anyone who knows or guesses an account id can act as that user — join queues, cancel entries, read data.
2. **Anyone can allot and collect cylinders.** `allotEntry` / `collectEntry` fall back to "the entry's own depot" when the caller is not a dealer, then check the entry against that same depot — so the ownership check always passes. Any visitor can allot stock at any depot.
3. **Anyone can become an admin.** `admin.ensureAdminAccount` is a public mutation that creates an admin account with the plaintext password `admin1234`, and `signIn` still accepts plaintext passwords for legacy rows. Also `app.updateRole` lets a signed-in user set their own role, including `admin`.
4. **Consumer PII exposed.** The dealer-scan queries return full name, citizenship number, address and phone for whatever account id is passed in, with no check that the caller is a dealer.
5. **Self-approving depots.** `upsertDealer` creates depots with `isActive: true` and `approvalStatus: "approved"`, bypassing the admin approval flow entirely.

Medium

6. Sessions never expire and are never deleted — sign-out only clears `localStorage`, so the token stays valid forever. Invalid/expired sessions are not cleaned up.
7. No rate limiting on sign-in or sign-up (unlimited password guessing, unlimited account creation).
8. `setEntryStatusForSeed` is a public mutation that sets any entry to any status.
9. Passwords use PBKDF2-SHA256 120k iterations — acceptable — but the plaintext fallback in `signIn` undermines it.

## What this pass fixes

**Backend authorization rewrite**

- One `requireSession` helper used everywhere: session token only, never an account id. Every function that reads or writes user data goes through it.
- Sessions get a 30-day expiry, a server-side `signOut` that deletes the row, expired-session pruning on sign-in, and the client drops the token the moment the server reports it invalid.
- `allotEntry`, `collectEntry`, `bulkAllot`, `autoAllotByStock`, `cancelEntry`: caller must be the approved owner of that depot — no fallbacks.
- Dealer scan queries take `consumerAccountId` and require an approved dealer session for that depot; the response drops citizenship number down to a masked tail.
- `updateRole` limited to consumer/dealer, never admin. Role elevation stays admin-only through `admin.setUserRole`.
- `upsertDealer` creates depots as pending/inactive, awaiting admin approval.
- `setEntryStatusForSeed` deleted.
- Plaintext password comparison removed; the demo admin is seeded with a hashed password and the seeding mutation is no longer callable from the browser. ( make this dev mode only accesed by the devopers from the local host or crt+shift+D)
- Simple rate limiting: failed sign-ins per email tracked in a table, 5 failures locks the email for 15 minutes; sign-up throttled per email. and what baout per ip too like from that device cevice rate limit and implate that in the most best way and optimal way 

**Bug/completion sweep**

- Client call sites stop sending `accountId` / `ownerAccountId` / `requesterAccountId` and always send the session token.
- Dealer scan page passes the scanned consumer's id under the new argument name.
- Expired-session handling: clear local state and send the user to sign-in with a "your session expired" message.

Add this feature

- Depot map view and distance sort.
- Multi-staff dealer accounts, so a depot can have more than one login.
- Exportable collection register (CSV) for dealer record-keeping.
- Exportable collection register (CSV) for dealer record-keeping.
- cizenship numbers are not validated in format   we will check the fromt from now one like citizen ship cnat be aplphabate only  numbers / , - etc 
- Time-boxed allotment: reserved cylinders auto-return to stock after N hours, and the next person in line is notified. (optional dealer can choose ) 

## Features worth adding next (not in this pass unless you say so)

- SMS/push alerts when a cylinder is allotted (a queue place is useless if you don't see the notification).
- Time-boxed allotment: reserved cylinders auto-return to stock after N hours, and the next person in line is notified.
- Dealer analytics: daily throughput, average wait time, no-show rate.
- Consumer household verification (one active household per citizenship number is enforced, but citizenship numbers are not validated in format).
- Depot map view and distance sort.
- Multi-staff dealer accounts, so a depot can have more than one login.
- Exportable collection register (CSV) for dealer record-keeping.

## Technical notes

Files touched: `convex/app.ts`, `convex/waitlist.ts`, `convex/admin.ts`, `convex/schema.ts` (session expiry + login-attempt table), `src/lib/auth.tsx`, and the route files that pass account ids (`dashboard`, `waitlist`, `dealer.index`, `dealer.waitlist`, `dealer.scan`, `onboarding`, `auth`). No UI redesign. Do all task in the best and optimla way to ehnce the whole app foundation and ux and another thing is be efficent and be the best and optimal to achive all of our golas and 