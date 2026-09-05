# PayPack

Escrow marketplace app (Next.js 16 + Postgres/Drizzle) — buyers and sellers create deals, funds sit in escrow until delivery is confirmed, plus wallet, chat, disputes/KYC, notifications and account settings.

## Prerequisites

- [Docker](https://www.docker.com/) + Docker Compose (recommended path, no local Node/Postgres needed), **or**
- Node.js 22+ and a Postgres database (e.g. [Neon](https://neon.tech)) for running without Docker

## Quick start (Docker — recommended)

```bash
cp .env.example .env
docker compose up
```

This builds the app image, starts Postgres and [Maildev](https://github.com/maildev/maildev) (catches outgoing emails locally), runs pending DB migrations, seeds demo data, and starts the dev server.

- App: http://localhost:3000
- Maildev inbox (password-reset emails etc.): http://localhost:1080

Demo accounts created by the seed (also printed in the container logs):

| Role  | Email               | Password      |
| ----- | ------------------- | ------------- |
| user  | demo@paypack.uno    | password123   |
| admin | admin@paypack.uno   | password123   |

## Running without Docker

```bash
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your own Postgres connection string (e.g. a Neon connection string)
- `SESSION_SECRET` — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- Leave `RESEND_API_KEY` empty for local dev — password-reset links are printed to the server console instead of emailed

Then:

```bash
npm install
npm run db:migrate   # applies Drizzle migrations to DATABASE_URL
node --env-file=.env scripts/seed.mjs   # optional: demo users + a demo deal
npm run dev
```

App runs at http://localhost:3000.

## Other useful commands

```bash
npm run test                          # run the test suite (Vitest)
npm run lint                          # lint
npm run build && npm run start        # production build/run
npm run db:generate                   # generate a new Drizzle migration after editing db/schema.ts
npm run make-admin -- <email>         # promote an existing user to admin (no self-serve way in the app)
```

## Project structure

- `app/` — Next.js App Router pages and API routes (`app/api/**/route.ts`)
- `db/schema.ts` — Drizzle schema (source of truth for the DB); `drizzle/` holds generated migrations
- `lib/` — server/shared helpers (auth, deals, payments, marketplace messaging, etc.)
- `components/` — UI components
- `extensions/paypack-marketplace/` — the companion browser extension (import a Facebook Marketplace listing into a deal, message the seller back on the marketplace)
- `scripts/` — one-off CLI scripts (`seed.mjs`, `make-admin.mjs`)

## Browser extension

`extensions/paypack-marketplace/` is a separate Chrome extension (Manifest V3) — load it unpacked via `chrome://extensions` in developer mode. See `extensions/paypack-marketplace/INSTALL.txt`.
