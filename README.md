# SST Booking System

A production-ready unified booking and resource management system for SST facilities, rooms, equipment, and library resources. Modernized and built with **Next.js 16 (App Router)**, **TypeScript**, **PostgreSQL**, **Drizzle ORM**, **Clerk Authentication**, and **shadcn/ui**.

---

## 🌟 Features

### 🏢 Core Functionality
- **Facility Booking**: Sports facilities (football turf, cricket nets, badminton courts, basketball courts) with slot-based scheduling.
- **Room Booking**: Discussion rooms, study rooms, conference rooms, and meeting spaces with customizable time slots (e.g., 2-hour duration).
- **Equipment Management**: Sports gear, lab apparatus, and hardware equipment with dynamic inventory and real-time quantity tracking.
- **Library Book Management**: ISBN cataloging, book borrowing, reserve queues, and automated returns.
- **Group Bookings**: Multi-participant booking workflows with invite acceptance/decline and attendance management.
- **QR Code Check-in / Check-out**: Secure check-in and checkout via cryptographic HMAC-signed QR tokens and camera scanning.
- **Automated Penalty System**: Automatic no-show detection, late return penalty points, damage grading, and suspension enforcement.
- **Lab & Resource Approvals**: Two-step administrative approval workflow with single-use secure email action tokens.
- **Comprehensive Admin Dashboard**: Real-time resource analytics, booking telemetry, penalty management, maintenance blocks, and audit logs.

### 👥 User Roles & Permissions
- **Students (`@sst.scaler.com`)**: Browse facilities, reserve slots, request lab equipment, generate check-in QR codes, invite peers to group bookings, and manage active reservations.
- **Admins (`@scaler.com`)**: Approve/reject lab equipment requests, define maintenance blocks, waive or apply penalties, manage inventory, view audit logs, and inspect analytics.
- **Guards**: Scan and validate QR codes at physical counters, mark equipment as issued, record returns, assess equipment condition, and flag damages.

### ⚡ Key Capabilities & Modern Upgrades
- **PostgreSQL + Drizzle ORM**: Fully typed database layer with type-safe schema validation via `drizzle-zod`.
- **Clerk Authentication**: Enterprise-grade identity management with role-based routing and domain restriction guardrails.
- **Shared Resource Mutex**: Concurrency locks preventing simultaneous bookings on overlapping multi-use resources (e.g., Football Turf vs. Cricket Ground).
- **Automated Suspension Enforcement**: Automatic 7-day account suspension when penalty threshold (5 points) is reached.
- **Fair-Use Booking Windows**: Rolling 7-day advance booking window with configurable daily and weekly booking limits.
- **Automated Email Notifications**: SMTP-backed email dispatches for booking confirmations, approval requests, approvals, and reminders.
- **shadcn/ui & Tailwind CSS**: Sleek, responsive, and accessible UI component architecture with Radix UI primitives.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | React full-stack framework with Server Actions & API Route Handlers |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | End-to-end static type safety |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) | Robust relational database storage |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) & [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) | TypeScript-first ORM and schema migration manager |
| **Validation** | [Zod](https://zod.dev/) & [drizzle-zod](https://github.com/drizzle-team/drizzle-orm/tree/main/drizzle-zod) | Runtime schema validation and database-inferred types |
| **Authentication** | [Clerk](https://clerk.com/) | Secure user identity, role management, and session handling |
| **UI & Styling** | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) | Accessible component library built on Radix UI primitives |
| **QR Engine** | [qrcode](https://www.npmjs.com/package/qrcode) & [html5-qrcode](https://www.npmjs.com/package/html5-qrcode) | QR code generation and in-browser camera scanning |
| **Date & Time** | [date-fns](https://date-fns.org/) & [date-fns-tz](https://github.com/marnusw/date-fns-tz) | Timezone-aware date calculations and slot formatting |
| **Email Service** | [Nodemailer](https://nodemailer.com/) | Transactional email delivery for bookings and approval links |
| **Containerization** | [Docker](https://www.docker.com/) & Docker Compose | Local and production containerized PostgreSQL and app runners |

---

## 🚀 Quick Start

Get the system running locally in 5 minutes!

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher (or pnpm/yarn)
- **Docker & Docker Compose** (recommended for PostgreSQL) or a local PostgreSQL 16 instance

---

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd BookingOwn/booking-own
npm install
```

---

### 2. Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Fill in the necessary values:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# PostgreSQL Database Connection
DATABASE_URL=postgres://booking_user:booking_password@localhost:5432/booking_own

# Docker / Postgres Defaults
POSTGRES_DB=booking_own
POSTGRES_USER=booking_user
POSTGRES_PASSWORD=booking_password

# QR Security (HMAC Signing)
QR_HMAC_SECRET=your-secure-qr-hmac-secret-here

# Email Configuration (Optional / SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@sst.scaler.com

# Domain Restrictions
ALLOWED_STUDENT_DOMAIN=sst.scaler.com
ALLOWED_ADMIN_DOMAIN=scaler.com
```

> **Generate cryptographic secrets:**
> ```bash
> openssl rand -base64 32
> ```

---

### 3. Start PostgreSQL Database

#### Option A: Using Docker Compose (Recommended)
```bash
docker compose up -d db
```

#### Option B: Using Local PostgreSQL
Ensure a database named `booking_own` exists matching your `DATABASE_URL` credentials.

---

### 4. Run Migrations & Seed Data

Push the Drizzle schemas and seed initial data:

```bash
# Push database schemas
npm run migrate:up

# Seed all resources, test users, facilities, and inventory
npm run seed:all
```

Or seed specific datasets individually:
```bash
npm run seed:facilities   # Seed sports turf, courts & rooms
npm run seed:resources    # Seed sports & lab equipment items
npm run seed:bookings     # Seed sample bookings
npm run seed:penalties    # Seed sample penalties & logs
npm run seed:dashboard    # Seed dashboard stats & audit logs
```

---

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Usage Guide

### 🎓 As a Student
1. **Sign In**: Log in using your college email (`@sst.scaler.com`).
2. **Explore Resources**: Navigate to **Facilities**, **Rooms**, **Equipment**, or **Library**.
3. **Reserve a Slot**:
   - Select your target date and available time slot.
   - For lab equipment, submit your project details (requires admin approval).
   - For group bookings, invite friends via their email addresses.
4. **Generate QR Token**: Once the booking is confirmed, open your booking card to reveal your secure single-use QR check-in code.
5. **Physical Check-in**: Present the QR code to the guard at the facility/desk within the check-in window.

**Student Limits & Rules**:
- Up to **3 active concurrent bookings** (2 facilities, 1 room, 5 equipment items).
- Bookings can be made up to **7 days in advance**.
- Standard slot durations: Facilities (60 min), Rooms (120 min), Equipment (120 min).

---

### 🛡️ As a Guard
1. **Access Guard Portal**: Navigate to `/guard/scanner`.
2. **Scan Check-in QR**:
   - Use the camera scanner or input token code manually.
   - The system checks booking validity, user penalty status, and timestamp window.
3. **Issue Equipment**: Mark equipment items as issued upon handover.
4. **Process Returns & Inspection**:
   - Navigate to `/guard/returns` or `/guard/library-returns`.
   - Inspect item condition on return.
   - Record returned status or flag damage/missing items to log penalty points automatically.

---

### ⚙️ As an Admin
1. **Sign In**: Authenticate using your admin email (`@scaler.com`).
2. **Dashboard**: View real-time active bookings, utilization charts, peak hours, and recent activity logs at `/admin/dashboard`.
3. **Lab & Request Approvals**: Review pending lab equipment and special booking requests at `/admin/lab-approvals` or via secure one-click email links.
4. **Maintenance Blocks**: Create resource blocks at `/admin/blocks` to disable reservations during maintenance, exams, or events.
5. **Penalties & Disputes**: Review student penalty history at `/admin/penalties` and waive unjustified penalties when appropriate.
6. **Resource & Inventory Management**: Add or edit facilities, rooms, sports items, lab apparatus, and library books.

---

## ⚖️ System Policies & Business Rules

### 📅 Booking Rules
| Policy | Value | Description |
| :--- | :--- | :--- |
| **Advance Booking Window** | 7 Days | Bookings open 7 days prior to the desired date |
| **Daily Booking Limit** | 2 Bookings | Max confirmed bookings per user per day |
| **Weekly Booking Limit** | 6 Bookings | Max confirmed bookings per user per rolling week |
| **Facility Slot Duration** | 60 Minutes | Fixed 1-hour slots with 0-minute transition buffers |
| **Room Slot Duration** | 120 Minutes | Fixed 2-hour slots for study and meeting rooms |
| **Equipment Loan Period** | 120 Minutes | Max continuous equipment checkout duration |
| **QR Validity Window** | -10 min to +15 min | Active window relative to booking start time |

### ⚠️ Penalty System
| Violation | Penalty Points | Automatic Action |
| :--- | :--- | :--- |
| **No-Show** | `+1 point` | Applied automatically if check-in does not occur within 15 minutes of start time |
| **Late Return** | `+1 point` | Applied when equipment is returned past due time |
| **Equipment Damage** | `+2 points` | Assigned by guard upon return inspection |
| **Severe Damage / Loss** | `+3 points` | Assigned with admin escalation |
| **Suspension Threshold** | **5 points** | **Automatic 7-day account suspension** (revokes booking privileges) |

### 🔒 Mutex Locks & Special Policies
- **Shared Turf Mutex**: The Football Turf and Cricket Pitch share the same physical ground. A booking on one immediately locks out the overlapping timeframe on the other.
- **Lab Equipment Gatekeeper**: Lab apparatus requests require explicit approval by an administrator before confirmation. Single-use tokens expire in 48 hours.
- **Anti-Hoarding Cooldown**: Rapid sequential cancellations or consecutive peak-slot hoarding are tracked in audit logs.

---

## 📁 Project Structure

```
BookingOwn/booking-own/
├── src/
│   ├── app/                         # Next.js App Router Pages & APIs
│   │   ├── (auth)/                  # Sign-in & Sign-up routes
│   │   ├── admin/                   # Admin portal (dashboard, inventory, blocks, penalties, approvals)
│   │   │   ├── analytics/           # Utilization charts & analytics
│   │   │   ├── audit-logs/          # System audit trail
│   │   │   ├── blocks/              # Resource maintenance blocks
│   │   │   ├── bookings/            # Admin booking management
│   │   │   ├── dashboard/           # Admin overview metrics
│   │   │   ├── lab-approvals/       # Lab request approval queue
│   │   │   ├── penalties/           # Penalty waiver & management
│   │   │   └── resources/           # Resource & equipment CRUD
│   │   ├── api/                     # REST API Route Handlers
│   │   │   ├── admin/               # Admin endpoints (approvals, stats, inventory)
│   │   │   ├── approve/             # Secure one-click email token approval handler
│   │   │   ├── availability/        # Real-time resource availability queries
│   │   │   ├── bookings/            # Booking CRUD, cancellation, QR issuance
│   │   │   ├── policies/            # System policy endpoints
│   │   │   ├── qr/                  # QR token validation
│   │   │   ├── resources/           # Public resource listing & search
│   │   │   ├── scanner/             # Guard check-in and return processing
│   │   │   └── user/                # User profile & booking history
│   │   ├── guard/                   # Guard portal (scanner, returns, history)
│   │   │   ├── returns/             # Equipment return processing
│   │   │   ├── library-returns/     # Library book return processing
│   │   │   └── scanner/             # Live camera & token scanner
│   │   ├── user/                    # Student pages (facilities, rooms, equipment, library, penalties)
│   │   ├── blocked/                 # Suspended account notice screen
│   │   ├── globals.css              # Global Tailwind CSS styles
│   │   └── layout.tsx               # Root layout & providers
│   ├── components/                  # React components
│   │   ├── ui/                      # shadcn/ui primitives (Button, Dialog, Card, Table, etc.)
│   │   ├── Navbar.tsx               # Navigation header with role-aware links
│   │   └── ...                      # Feature-specific modals & forms
│   ├── lib/
│   │   ├── db/                      # Drizzle ORM setup & schema definitions
│   │   │   ├── schema.ts            # PostgreSQL table definitions
│   │   │   └── index.ts             # Drizzle client instance
│   │   ├── auth/                    # Clerk auth utilities & domain checks
│   │   ├── email.ts                 # Nodemailer transport & templates
│   │   ├── qr.ts                    # HMAC QR token generation & validation
│   │   ├── policies.ts              # Business rules & penalty calculators
│   │   └── utils.ts                 # Formatting & class merging utilities
│   └── middleware.ts                # Route protection & role enforcement middleware
├── drizzle/                         # Drizzle schema migrations
├── scripts/                         # Database seeding & utility scripts
│   ├── seed-db.mjs                  # Comprehensive database seeder
│   ├── seed-equipment.mjs           # Equipment inventory seeder
│   └── install-git-hooks.sh         # Git hooks installer
├── docker-compose.yml               # Docker Compose configuration (PostgreSQL & app)
├── drizzle.config.ts                # Drizzle Kit configuration
├── next.config.ts                   # Next.js runtime configuration
├── package.json                     # Project dependencies & scripts
└── tsconfig.json                    # TypeScript configuration
```

---

## 📡 API Endpoints Reference

### 🔐 Authentication & Profile
- `GET /api/user/me` - Fetch authenticated user session, role, and active penalties.

### 📅 Bookings & Availability
- `GET /api/availability?resourceId=:id&date=:date` - Query available time slots for a given resource and date.
- `GET /api/bookings` - List bookings for current user (or filtered list for admin).
- `POST /api/bookings` - Create a new booking reservation.
- `PATCH /api/bookings/:id/cancel` - Cancel an active booking reservation.
- `POST /api/bookings/:id/qr` - Generate an HMAC-signed QR token for a confirmed booking.

### 🛡️ Guard & Scanner
- `POST /api/qr/validate` - Validate QR token on check-in and mark booking as active.
- `POST /api/scanner/return` - Process return of equipment or library books, grading condition.

### ⚙️ Admin Operations
- `GET /api/admin/stats` - Telemetry, utilization statistics, and overview counts.
- `GET /api/admin/approvals` - Fetch pending lab approval requests.
- `POST /api/admin/approvals/:id` - Approve or reject a pending lab request.
- `GET /api/approve/:token` - One-click secure token approval/rejection from email.
- `GET/POST /api/admin/equipment` - Fetch and manage equipment inventory items.

---

## 🗄️ Database Management & Scripts

This project uses **Drizzle ORM** with **PostgreSQL**.

### Drizzle Kit Commands
```bash
# Check pending schema differences
npm run migrate:status

# Push schemas to PostgreSQL
npm run migrate:up

# Roll back migrations
npm run migrate:down
```

### Seeding Commands
```bash
# Seed full database (facilities, rooms, equipment, users, penalties)
npm run seed:all

# Individual seed targets
npm run seed:facilities   # Seed sports turf, badminton courts, meeting rooms
npm run seed:resources    # Seed sports & lab equipment items
npm run seed:bookings     # Seed sample bookings
npm run seed:penalties    # Seed sample penalties
npm run seed:dashboard    # Seed analytics telemetry data
```

---

## 🐳 Docker Deployment

Run the entire stack (PostgreSQL and Next.js application) containerized:

```bash
# Start PostgreSQL only
docker compose up -d db

# Build and run the entire development environment with Docker
npm run dev:docker
```

---

## 🔒 Security Architecture

- **Role-Based Access Control (RBAC)**: Enforced via `src/middleware.ts` protecting student (`/user`), guard (`/guard`), and admin (`/admin`) routes.
- **Domain Whitelisting**: Strict verification ensuring students register with `@sst.scaler.com` and staff with `@scaler.com`.
- **HMAC-SHA256 Signed QR Tokens**: Prevents forged QR codes; tokens expire after the check-in window and are invalidated upon use.
- **Zod & drizzle-zod Schema Validation**: Strict input sanitization across all API mutation endpoints.
- **Audit Logging**: Comprehensive logging for all administrative actions, resource modifications, penalty adjustments, and cancellations.

---

## 🔧 Troubleshooting & FAQ

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Cannot connect to PostgreSQL** | Database container not running or incorrect credentials | Ensure Docker is running: `docker compose up -d db`. Verify `DATABASE_URL` in `.env`. |
| **Clerk authentication error** | Missing or invalid Clerk API keys | Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env`. |
| **QR Code is invalid / expired** | Token scanned outside the valid window (-10 to +15 min) | Ensure check-in occurs within the scheduled timeframe. Check system clock sync. |
| **Booking limit exceeded error** | User reached daily (2) or weekly (6) cap | Check active bookings in user dashboard or wait for past bookings to complete. |
| **Resource shows unavailable** | Mutex conflict or maintenance block | Check if shared turf is booked or an admin maintenance block is active on `/admin/blocks`. |
| **Schema out of sync** | Database tables do not match `schema.ts` | Run `npm run migrate:up` to apply pending Drizzle migrations. |

---

## 🔮 Future Enhancements

- [ ] Real-time WebSocket updates for instant slot availability.
- [ ] Push notifications for booking reminders and return deadlines.
- [ ] WhatsApp notifications via Twilio integration.
- [ ] Advanced drag-and-drop calendar interface for scheduling.
- [ ] RFID / NFC smartcard support at guard desks.
- [ ] Native Mobile App (React Native / Expo).

---

## 📄 License

MIT License — Free for educational and institutional use.

---

**Built with ❤️ for SST**
