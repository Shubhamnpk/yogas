# YoGas

YoGas is a Convex-backed LPG waitlist and depot management system for Nepal. It gives consumers a place to join a queue, gives dealers a compact dashboard for allotment and handover, and keeps purchase history, cooldowns, and identity checks in one place.

## What it does

- Consumers can sign up, complete a profile, and join multiple depot waitlists.
- Dealers can see a dense queue view with waiting, allotted, and collected entries.
- When a dealer allots a request, other active requests for the same consumer are automatically cancelled.
- After collection, the system starts a cooldown period so the same consumer cannot immediately rejoin.
- Citizenship numbers are enforced as unique, and dealers can verify them during handover.
- A QR scan flow is available for both depot verification and consumer lookup.
- Demo accounts are available for quick testing.

## Architecture

The app is split between a TanStack Router frontend and Convex backend functions.

- `convex/app.ts` handles authentication, profiles, dealer setup, stock updates, and demo account creation.
- `convex/waitlist.ts` handles depot listing, queue joins, allotment, collection, cancellation, and consumer history.
- `convex/notifications.ts` sends notification counts and unread updates.
- `src/lib/auth.tsx` stores the Convex session token in local storage and loads the current account from Convex.

The current auth model uses a server-issued session token. The browser never needs to trust a raw account id for privileged actions.

## Data model

The main collections are:

- `accounts` - login identity, role, and password hash
- `users` - consumer profile data and purchase history fields
- `dealers` - depot business details, owner account, stock, and status
- `waitlistEntries` - queue requests, allotment state, and handover history
- `notifications` - per-user alerts
- `sessions` - Convex session tokens for authenticated access

This keeps identity and business data separate while still anchoring both consumers and dealers to one account record.

## Key workflows

### Consumer sign-up

1. Create an account with email and password.
2. Store the password as a hash on the server.
3. Create a unique user profile and generate a session token.

### Dealer queue management

1. Open the depot dashboard.
2. Review waiting, allotted, and collected rows in a compact table.
3. Allot a request when stock is available.
4. Confirm collection when the consumer arrives.

### Duplicate prevention and cooldowns

- Citizenship numbers are unique across users.
- After a collection, the user enters a cooldown window before they can request again.
- Other active waitlist entries are cancelled when one depot completes the handover.

### QR scan flow

- Consumers use a QR code tied to their account.
- Dealers use the scan screen to look up the consumer by QR or manual code.
- The center scan button in the mobile nav opens the scanner directly.

## Demo accounts

Demo accounts are seeded through Convex so you can test the app without creating fresh records every time.

## Local development

```sh
npm install
npm run dev
```

If you want to run the backend locally with Convex, make sure your `.env.local` contains the correct `CONVEX_DEPLOYMENT` value and that the Convex dev process is running.

## Notes

- Login failures are intentionally generic to avoid leaking whether an email exists.
- Dealers start with `0` stock by default.
- The app is designed to stay readable with large queues by keeping dealer management in a table view instead of spreading requests across cards.

