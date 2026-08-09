# Development Environment Setup Guide

This document provides step-by-step instructions for setting up, configuring, and running the development environment for **Booking Own** (`booking-own`).

---

## 📋 Prerequisites

Ensure you have the following installed on your development machine:

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose**: (Recommended for running PostgreSQL and containerized services)
- **PostgreSQL 16**: (Optional if running a native local database instance instead of Docker)
- **Git**

---

## 🚀 Quick Start (Local Setup)

### 1. Clone & Navigate to Repository

```bash
git clone <repository-url>
cd BookingOwn/booking-own
```

### 2. Install Dependencies

```bash
npm install
```

---

## ⚙️ Environment Configuration

1. Create a `.env` file in the `BookingOwn/booking-own` root directory by copying `.env.example`:

```bash
cp .env.example .env
```

2. Configure the environment variables in `.env`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database Connection
DATABASE_URL=postgres://booking_user:booking_password@localhost:5432/booking_own

# Docker / Postgres defaults
POSTGRES_DB=booking_own
POSTGRES_USER=booking_user
POSTGRES_PASSWORD=booking_password

# QR Code HMAC Secret
QR_HMAC_SECRET=your_dev_qr_hmac_secret_here
```

---

## 🗄️ Database Setup & Seeding

### Option A: Using Docker for PostgreSQL (Recommended)

1. Start the PostgreSQL container:

```bash
docker compose up -d db
```

2. Verify the database container status:

```bash
docker compose ps
```

### Option B: Local PostgreSQL Installation

If using a local PostgreSQL instance, ensure a database named `booking_own` exists and credentials match your `.env` file (`DATABASE_URL`).

---

### Running Migrations & Seeding Data

1. **Check Migration Status**:

```bash
npm run migrate:status
```

2. **Push Schema / Run Migrations**:

```bash
npx drizzle-kit push
# OR
npm run migrate:up
```

3. **Seed Database**:

```bash
# Seed all initial mock data (facilities, resources, bookings, penalties, dashboard)
npm run seed:all
```

Or seed specific datasets individually:
- `npm run seed:facilities`
- `npm run seed:resources`
- `npm run seed:bookings`
- `npm run seed:penalties`
- `npm run seed:dashboard`

---

## 💻 Running the Development Server

### 1. Standard Local Development (Next.js Turbopack)

```bash
npm run dev
```

- Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2. Containerized Development with Docker Compose

To run both the application and database inside Docker containers:

```bash
npm run dev:docker
# OR
docker compose up --build
```

---

## 🔍 Verification & Code Quality

Run the following commands to verify code health before committing:

### TypeScript Typechecking
```bash
npx tsc --noEmit
```

### Production Build Verification
```bash
npm run build
```

### Linting
```bash
npm run lint
```

---

## 🛠️ Troubleshooting & Common Issues

### 1. Port 3000 Already in Use

If port 3000 is occupied by a stale process:

**On Windows (PowerShell / Command Prompt):**
```powershell
# Find PID listening on port 3000
netstat -ano | findstr :3000

# Terminate process by PID (e.g. PID 4016)
taskkill /PID 4016 /F
```

**On Linux / macOS:**
```bash
lsof -i :3000
kill -9 <PID>
```

---

### 2. Database Connection Errors

- Ensure PostgreSQL is running (`docker compose ps` or local service check).
- Verify credentials in `.env` match `DATABASE_URL`.
- Test database health check command: `docker exec -it booking-own-db pg_isready -U booking_user -d booking_own`.

---

### 3. Missing `QR_HMAC_SECRET` Warning

Set `QR_HMAC_SECRET` in `.env` to prevent fallback warnings during build/dev execution.
