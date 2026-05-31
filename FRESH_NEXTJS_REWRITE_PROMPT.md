# Fresh Next.js Rewrite Brief

Use this document as the source of truth for rebuilding the current booking system in a brand-new Next.js application. Do not copy the existing codebase structure or implementation patterns. Recreate the product from scratch with a modern, consistent architecture.

## Product Goal

Build a clean, production-ready booking platform for SST facilities, rooms, equipment, and admin workflows. The rewrite should preserve the user-facing capabilities of the current system, but the codebase must be simpler, more opinionated, and easier to extend.

## Non-Negotiable Stack Decisions

- Next.js App Router
- TypeScript
- Clerk for authentication and user management
- Drizzle ORM for database access
- Neon Postgres as the database host
- Server Actions only for data mutations and primary data fetching flows
- Tailwind CSS + shadcn/ui for UI composition
- Deploy on Vercel

## What Must Change

- Replace Prisma with Drizzle ORM.
- Replace mixed patterns with a single server-action-driven architecture.
- Replace ad hoc custom UI with a coherent shadcn/ui-based design system.
- Rebuild the data layer for PostgreSQL cleanly, even if the current data already exists.
- Remove the architectural clutter, duplicated patterns, and unclear module boundaries from the current codebase.

## What Should Stay

- Clerk stays.
- Neon Postgres stays.
- Vercel stays.
- The product domain stays the same: bookings, admin workflows, approvals, penalties, resources, and role-based access.

## Product Scope

The new application should cover these major capabilities:

- Facility booking for sports grounds and courts.
- Room booking for meeting and study spaces.
- Equipment booking with quantity tracking.
- Group bookings and participant invitations.
- Approval flows for restricted requests.
- QR-based check-in and checkout flows.
- Penalty tracking for no-shows, late returns, and damage.
- Admin dashboards for analytics and operational management.
- Role-based experiences for students, admins, and guards.

## Roles

- Students: browse availability, create bookings, manage their bookings, receive notifications.
- Admins: manage resources, approve requests, create blocks, inspect bookings, review penalties, and view analytics.
- Guards: verify check-ins and check-outs, scan QR tokens, process returns, and mark incidents.

## Architecture Rules

- Use a clean src-first structure.
- Keep all application logic organized by feature or domain, not by technical noise.
- Put shared primitives in a small UI layer and keep feature-specific components close to the features that use them.
- Treat server actions as the main application boundary for reads and writes.
- Use Zod for validation at the boundary of every server action and form submission.
- Keep client components minimal; only use them when interactivity truly requires it.
- Use a single source of truth for domain rules such as booking windows, limits, approval rules, and penalties.

## Recommended Folder Structure

```text
src/
  app/
    (auth)/
    (marketing)/
    (dashboard)/
    api/                  # only if absolutely necessary for external integrations/webhooks
  components/
    ui/
    shared/
  features/
    bookings/
    approvals/
    resources/
    penalties/
    analytics/
    guard/
    admin/
    notifications/
  lib/
    auth/
    db/
    domain/
    validations/
    utils/
    constants/
  server/
    actions/
    queries/
    services/
  types/
  styles/
```

## Data Layer Requirements

- Use Drizzle schema definitions for all tables.
- Model the system for PostgreSQL first, not as a generic ORM abstraction.
- Keep migrations explicit and readable.
- Separate domain tables for users, roles, resources, bookings, booking participants, approvals, blocks, penalties, notifications, and audit logs as needed.
- Keep booking and availability logic in server-side domain code rather than scattering it across UI components.

## Server Action Rules

- Use server actions for create, update, delete, and most data retrieval flows.
- Avoid client-side fetching libraries unless a specific interactive use case truly needs them.
- Keep actions thin: validate input, call domain services, return typed results.
- Put business rules into reusable server-side services, not directly inside page components.

## UI Direction

- Use shadcn/ui as the foundation.
- Design the interface as a modern internal product, not as a generic dashboard template.
- Keep typography, spacing, and color usage consistent across the app.
- Build reusable primitives for cards, tables, dialogs, forms, empty states, status badges, and command surfaces.
- Prefer a restrained, clear visual language over decorative clutter.

## Expected Pages / Routes

The exact route map can evolve, but the app should cover:

- Public landing or sign-in entry.
- User dashboard.
- Resource browsing and booking flows.
- Booking detail and history pages.
- Admin dashboard.
- Resource management pages.
- Approval queues.
- Penalty views.
- Audit or activity log views.
- Guard workflow pages for scan/verify/return handling.

## Domain Rules To Preserve

- Booking windows, slot durations, and capacity limits must be enforced on the server.
- Approval-required resources must not confirm until approved.
- QR or check-in flows must be tamper-resistant and validated server-side.
- Penalty logic must be deterministic and visible in admin views.
- Shared resource constraints must be respected when multiple booking types compete for the same physical asset.

## Engineering Standards

- Keep linting, formatting, and types strict from the start.
- Use consistent naming and avoid mixed conventions.
- Prefer small, composable modules over large utility dumps.
- Add tests for critical server-side booking logic, validation, and access control.
- Do not over-engineer with unnecessary abstractions.

## Build Expectations

- Start from a fresh Next.js app scaffold.
- Configure Clerk, Drizzle, Neon, Tailwind, and shadcn/ui cleanly.
- Create a strong foundation before implementing every feature.
- Make the app runnable locally with clear env vars and seed data.
- Keep deployment configuration compatible with Vercel.

## Suggested Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=

DATABASE_URL=

NEXT_PUBLIC_APP_URL=
```

## Implementation Order

1. Scaffold the app and configure the core stack.
2. Define the Drizzle schema and core domain types.
3. Build authentication and role-aware routing.
4. Implement booking creation and availability validation.
5. Add admin and guard workflows.
6. Add approvals, penalties, logs, and notifications.
7. Polish the UI and tighten validation.
8. Add tests and seed data.

## Important Constraints

- Do not reuse the current code structure just because it exists.
- Do not mix Prisma patterns into the rewrite.
- Do not introduce a second data-fetching paradigm unless required for a very specific edge case.
- Do not ship a feature before its server-side invariants are defined.
- Do not treat the rewrite as a visual refresh only; it is a full architectural reset.

## Definition Of Done

- A new Next.js app is running with Clerk auth, Drizzle, and Neon.
- Core booking flows work end-to-end.
- Admin and guard flows work end-to-end.
- The codebase has a clear structure and no obvious architectural drift.
- The UI is coherent and based on shadcn/ui.
- The project is ready to be expanded without reintroducing the previous mess.

## Notes For The Coding AI

If anything is ambiguous, choose the simplest modern Next.js implementation that preserves the domain behavior. Favor clean architecture, explicit server-side boundaries, and readable code over clever abstractions.