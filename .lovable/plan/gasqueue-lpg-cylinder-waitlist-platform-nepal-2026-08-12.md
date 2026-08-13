# YoGas — LPG Cylinder Waitlist Platform (Nepal)

A production-ready platform connecting LPG dealers and consumers: consumers join a dealer's virtual waitlist, dealers verify and allot cylinders by scanning the consumer's QR code.

## Core flows

**Consumer**
1. Sign up / log in (email + password).
2. Complete profile once: full name, citizenship number, address, phone. Required before joining any waitlist.
3. Find a dealer — scan the dealer QR code, or search dealers by name / depot / district.
4. Join the waitlist: choose cylinder size, quantity, add an optional note. Gets a queue position.
5. Dashboard shows: live queue position, status (Waiting / Allotted / Collected / Cancelled), the dealer's stock status, and their own QR code (used at the depot).
6. Notifications in-app when their status changes (allotted, ready for pickup, cancelled).

**Dealer**
1. Sign up / log in, then register the depot: business name, license number, address, district, contact.
2. Dashboard: today's stock count, waiting count, allotted count, collected today.
3. Waitlist table: ordered queue with consumer name, masked citizenship number, requested quantity, note, joined time. Actions: Allot, Cancel, Mark collected.
4. Scan consumer QR: instantly shows whether that person is in the queue, their position, and whether they have an allotment. From the scan result the dealer can allot on the spot (if stock available) or mark the cylinder handed over.
5. Stock management: set/adjust available cylinders; stock decrements on allotment.
6. Public dealer QR code + printable poster so consumers can scan at the depot.

## Design direction

Clean, calm, high-trust utility app — not a generic dashboard. Warm flame-amber primary against deep slate, generous whitespace, big legible numbers for queue position and stock, card-based mobile-first layouts (most users are on phones), soft elevation, subtle motion on state changes. Status colors: waiting (amber), allotted (green), collected (slate), cancelled (red). Nepali-context friendly copy.

## Pages

- `/` — public landing: what it does, join as consumer / dealer CTAs, dealer search
- `/auth` — single login page (default view), sign up with a role choice made at signup, not a toggle on the page
- `/onboarding` — profile completion (consumer) or depot registration (dealer)
- `/dashboard` — consumer home: current requests, queue positions, my QR
- `/dealers` and `/dealers/$id` — browse/search dealers, dealer detail + join waitlist form
- `/scan` — consumer scanning a dealer QR (camera), routes to that dealer
- `/dealer` — dealer dashboard, stats + waitlist management
- `/dealer/scan` — dealer camera scanner for consumer QR + verification result panel
- `/dealer/stock` — stock updates and history
- `/notifications` — activity feed

## Technical notes

- Lovable Cloud (Postgres + auth) enabled for accounts, data, and RLS.
- Tables: `profiles` (name, citizenship_no, address, phone, role-independent), `user_roles` (separate table, enum `consumer` | `dealer`, with `has_role()` security-definer function), `dealers` (owner, business name, license, district, stock, public code), `waitlist_entries` (dealer, consumer, quantity, size, note, status, position, allotted_at, collected_at), `notifications`.
- RLS: consumers read/write only their own entries and profile; dealers read entries for their own depot only; dealer public listing exposes name/district/stock status only, never consumer data. Explicit GRANTs on every table.
- Queue position computed from created_at ordering per dealer, not a mutable counter.
- QR: `qrcode.react` for generating codes, `@zxing/browser` (or `html5-qrcode`) for camera scanning, with a manual code-entry fallback when the camera is blocked.
- All reads/writes through TanStack Start server functions with auth middleware; protected routes under `_authenticated`.
- Citizenship numbers stored server-side and shown masked in dealer views; validated with zod.
- Seed migration includes a few demo dealers so the app isn't empty on first load.

## Out of scope for this pass

SMS/push notifications (in-app only), payments, and admin/government oversight roles — easy to add later.
