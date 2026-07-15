# APTix — ADTEC Pedas ICT Ticketing System

**i-Aduan ICT** — A web-based ICT incident reporting, assignment, and resolution-tracking platform for **ADTEC JTM Kampus Pedas** (Bahagian Pengurusan Sumber Manusia).

Built per the JTM ICT Ticketing System PRD. Backend: **Supabase** (PostgreSQL). Hosting: **Netlify**.

---

## Features

- **Role-based access** — Issuer, Technician, Admin (with RLS-equivalent security)
- **Ticket lifecycle** — Issued → In Progress → Resolved → Confirmed (issuer confirms)
- **Colour-coded dashboard** — Red / Yellow / Green / Teal status indicators
- **Real-time updates** — Socket.io pushes ticket changes to all dashboards
- **Email notification logging** — Assignment, resolution, and confirmation emails
- **Admin tools** — User management (single + bulk CSV upload), ticket assignment, delete tickets/users
- **Security** — bcrypt password hashing, JWT sessions, CSP headers, rate limiting, forced password change on first login
- **Glassmorphism UI** — Modern teal/emerald design with light/dark mode
- **Responsive** — Mobile-first, works on all devices

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (App Router) |
| Database | Supabase PostgreSQL (Prisma ORM) |
| Real-time | Socket.io (mini-service on port 3031) |
| Auth | bcrypt + JWT (httpOnly cookies) |
| Hosting | Netlify |

---

## Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) 20+ and [Bun](https://bun.sh/)
- A [Supabase](https://supabase.com/) project (free tier works)

### 1. Clone & install
```bash
git clone https://github.com/asallehsabri/APTix.git
cd APTix
bun install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in your Supabase credentials:
- `DATABASE_URL` — Supabase pooler connection string (port 5432)
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_ANON_KEY` — Your Supabase publishable key
- `JWT_SECRET` — A random 32+ character string

> **Password note:** URL-encode any special characters in your DB password.
> e.g. `@` → `%40`

### 3. Set up the database
```bash
# Create all tables in Supabase
bunx prisma db push

# Generate Prisma client
bunx prisma generate

# Seed dummy data (10 users, 15 tickets, categories, history, notifications)
bunx tsx prisma/seed.ts
```

Alternatively, run the SQL setup file directly in the Supabase SQL Editor:
- Open `supabase-setup.sql` from this repo
- Paste into Supabase Dashboard → SQL Editor → Run

### 4. Start the dev servers
```bash
# Terminal 1: Realtime service
cd mini-services/realtime-service
bun install
bun run dev

# Terminal 2: Next.js app
cd /path/to/APTix
bun run dev
```

Open http://localhost:3000

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin (must change pw) | `asallehsabri@jtm.gov.my` | `Password@123` |
| Admin | `norliza@jtm.gov.my` | `Pedas@2026` |
| Technician | `firdaus@jtm.gov.my` | `Pedas@2026` |
| Issuer | `aminah@jtm.gov.my` | `Pedas@2026` |

---

## Deploy to Netlify

### 1. Push to GitHub
This repo is already on GitHub: https://github.com/asallehsabri/APTix

### 2. Connect to Netlify
1. Go to [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**
2. Select the `APTix` GitHub repo
3. Build settings (auto-detected from `netlify.toml`):
   - **Build command:** `bun run build`
   - **Publish directory:** `.next`
4. Add environment variables (Site settings → Environment variables):
   - `DATABASE_URL` — Your Supabase pooler connection string
   - `SUPABASE_URL` — `https://YOUR_PROJECT.supabase.co`
   - `SUPABASE_ANON_KEY` — Your publishable key
   - `JWT_SECRET` — A strong random string
5. Click **Deploy**

### 3. Post-deploy
- Netlify will automatically redeploy on every push to `main`
- The realtime mini-service runs separately (see below)

---

## Realtime Service (Optional)

The dashboard auto-refreshes via a Socket.io mini-service. In production, deploy it as a separate service (e.g. on Railway, Render, or a VPS):

```bash
cd mini-services/realtime-service
bun install
bun run dev   # runs on port 3031
```

Update `src/lib/ticket-utils.ts` → `emitTicketChange()` to point to your deployed realtime URL instead of `http://127.0.0.1:3031`.

---

## Project Structure

```
APTix/
├── prisma/
│   ├── schema.prisma          # Database schema (PostgreSQL)
│   └── seed.ts                # Dummy data seeder
├── src/
│   ├── app/
│   │   ├── api/               # API routes (auth, tickets, users, etc.)
│   │   ├── globals.css        # Glassmorphism theme
│   │   ├── layout.tsx
│   │   └── page.tsx           # Main SPA entry
│   ├── components/
│   │   ├── app/               # App views (dashboard, tickets, etc.)
│   │   └── ui/                # shadcn/ui components
│   ├── lib/                   # Auth, security, API client, utils
│   ├── stores/                # Zustand state
│   └── hooks/                 # Realtime hook
├── mini-services/
│   └── realtime-service/      # Socket.io service (port 3031)
├── public/
│   └── logo-adtec.png         # ADTEC JTM Kampus Pedas logo
├── supabase-setup.sql         # Complete SQL setup (schema + seed)
├── netlify.toml               # Netlify deployment config
├── .env.example               # Environment template
└── package.json
```

---

## Security

- **Passwords** hashed with bcrypt (cost 10)
- **Sessions** via httpOnly, SameSite=Strict cookies (8h expiry)
- **RLS-equivalent** access control enforced in every API route
- **CSP** + security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **Rate limiting** on login (8 attempts / 5 minutes)
- **Forced password change** on first login (PRD §2.4)
- **Input validation** with Zod on all API endpoints

---

## License

Government of Malaysia — Jabatan Tenaga Manusia (JTM). For internal use at ADTEC Pedas.

---

## Built with

- [z.ai](https://z.ai) (GLM) — AI-assisted development
- [Supabase](https://supabase.com/) — Backend
- [Netlify](https://netlify.com/) — Hosting
