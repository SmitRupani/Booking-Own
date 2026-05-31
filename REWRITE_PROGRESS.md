# Rewrite Progress Log

This file records the actions taken while applying the Fresh Next.js Rewrite brief to this repository (`booking-own`). Use this file to continue work in the next session.

## Summary (started)

- Date: 2026-05-31
- Goal: Scaffold core stack pieces per the rewrite brief (Clerk, Drizzle, Zod, server-actions pattern).

## Changes Applied

1. Updated `package.json` to add core dependencies: `@clerk/nextjs`, `drizzle-orm`, `pg`, and `zod`.
2. Added initial Drizzle DB client skeleton at `src/lib/db/client.ts`.
3. Added example Drizzle schema at `src/lib/db/schema.ts`.
4. Added a sample server action with Zod validation at `src/server/actions/createBooking.ts`.
5. Added a small `bookingService` domain module at `src/server/services/bookingService.ts`.
6. Added a validation schema at `src/lib/validations/booking.ts`.

7. Added shadcn-style UI primitives and layout components:
	- `src/components/ui/Button.tsx`
	- `src/components/ui/Toaster.tsx`
	- `src/components/Navbar.tsx`
	- `src/components/AuthProvider.tsx`
	- Updated `src/app/layout.tsx` to include the new components.

8. Created initial frontend pages to match SST navigation and layout:
	- `src/app/page.tsx` (home)
	- `src/app/user/dashboard/page.tsx`
	- `src/app/user/facilities/page.tsx`
	- `src/app/user/rooms/page.tsx`
	- `src/app/user/equipment/page.tsx`

9. Added shadcn-style UI primitives and theme tokens:
	- `src/components/ui/Card.tsx`
	- `src/components/ui/Badge.tsx`
	- `src/components/ui/Input.tsx`
	- Updated `src/app/globals.css` with SST-like theme tokens and utilities
	- Refactored `src/app/page.tsx` and `src/app/user/dashboard/page.tsx` to use `Card` and `Badge`.

10. Added further UI primitives and scaffolded remaining pages:
	- `src/components/ui/Table.tsx`, `Dialog.tsx`, `EmptyState.tsx`, `Sidebar.tsx`
	- Expanded `Navbar` with full user/admin/guard routes
	- User pages: `bookings`, `group-invitations`, `penalties`
	- Admin pages: `dashboard`, `resources`, `lab-approvals`, `bookings`, `group-bookings`, `blocks`, `penalties`, `settings`, `email-routing`, `audit-logs`, `bulk-operations`, `analytics`
	- Guard pages: `scanner`, `returns`, `library-returns`, `history`

These are UI scaffolds only — they use the shadcn-style primitives added earlier.

11. Fixed visual and navigation issues:
	- Enabled dark theme by default in `src/app/layout.tsx` (added `dark` class on html root) to apply the shadcn dark tokens and prevent a white background.
	- Made `Navbar` role-aware in `src/components/Navbar.tsx` and added a dev role selector (localStorage-backed) to test Student/Admin/Guard-specific navigation. Replaceable by Clerk auth integration.

## Next Steps (recommended)

- Install dependencies (`pnpm install` or `npm install`) and verify the app builds.
- Integrate Clerk provider into `src/app/layout.tsx` and add Clerk env vars.
- Wire Drizzle client to a real Postgres `DATABASE_URL` and run migrations.
- Implement domain tables in `src/lib/db/schema.ts` following the brief's data requirements.
- Replace this example server action with a real server-action-based router and add tests for booking invariants.

---

If you'd like, I can run the next steps now (install deps, wire Clerk into layout, or add more domain tables). Which would you like me to do next?

## Recent edits (2026-05-31)

- Added compatibility wrapper for `Card` to preserve default imports: `src/components/ui/Card.tsx`.
- Replaced `src/components/ui/Button.tsx` with a small wrapper that re-exports the shadcn `button` implementation (`src/components/ui/button.tsx`) to avoid duplicate export issues.

These changes make the codebase resilient to the shadcn CLI's lowercase component filenames while keeping existing imports stable.
