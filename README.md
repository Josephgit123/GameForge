# GameForge

GameForge is a Steam-like digital game marketplace built as an internship
project for Surfboard Payments. It's a 2-3 day build whose point is to
demonstrate a real, working integration with Surfboard's payments APIs —
merchant onboarding, checkout, webhooks, refunds, gift cards, and
promotions — rather than a mocked checkout button. See
[CLAUDE.md](CLAUDE.md) for the full project brief this was built from.

## Tech stack

- **Frontend:** React (Vite) + TypeScript — `client/`
- **Backend:** Node.js + Express + TypeScript — `server/`
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT, role-gated middleware (`CUSTOMER` / `PUBLISHER` / `ADMIN`)
- **Payments:** Surfboard Payments API (sandbox)

## Prerequisites

- Node.js — latest LTS recommended (version not pinned in project docs;
  confirm and update here once settled)
- PostgreSQL (14+ should work; version not pinned in project docs)
- A Surfboard Developer Portal Console account with sandbox access (API
  key/secret, partner ID) — see [docs/SETUP.md](docs/SETUP.md#4-get-surfboard-sandbox-credentials)

## Setup

```bash
git clone <repo-url> gameforge
cd gameforge

# install deps in both apps
cd server && npm install
cd ../client && npm install
cd ..

# configure env vars — see .env.example for every variable and what it's for
cp .env.example server/.env
cp .env.example client/.env
# then edit each down to its relevant section and fill in real values

# run migrations and seed data (from server/)
cd server
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
cd ..

# start both dev servers, in two terminals
cd server && npm run dev
cd client && npm run dev
```

Full step-by-step version, including Surfboard sandbox credential setup and
the local webhook tunnel, is in [docs/SETUP.md](docs/SETUP.md).

## Folder structure

```
gameforge/
├── CLAUDE.md              # source of truth: architecture, schema, API plan, build order
├── README.md              # this file
├── .env.example           # every env var used across server/ and client/
├── docs/
│   ├── ARCHITECTURE.md    # roles, portal/backend/DB interaction, SurfboardClient pattern
│   ├── DATABASE.md        # full Prisma schema, relationships, WebhookEvent idempotency
│   ├── API_INTEGRATION.md # API-to-screen map, per-API detail, onboarding + post-payment sequences
│   ├── SETUP.md           # detailed local dev setup, common errors
│   └── DEMO_SCRIPT.md     # 5-minute demo runbook with fallbacks
├── server/                # Express + TypeScript API, Prisma schema/migrations, SurfboardClient
└── client/                # React (Vite) + TypeScript frontend — customer/publisher/admin views
```

## Docs

- [Architecture](docs/ARCHITECTURE.md) — roles, system diagram, why all
  Surfboard calls go through one wrapper service
- [Database](docs/DATABASE.md) — every table, Surfboard ID fields, the
  webhook idempotency pattern
- [API Integration](docs/API_INTEGRATION.md) — full API-to-screen map,
  merchant onboarding sequence, KYB demo fallback, post-payment sequence
- [Setup](docs/SETUP.md) — detailed local dev setup and common errors
- [Demo Script](docs/DEMO_SCRIPT.md) — the 5-minute demo, screen by screen,
  with a fallback plan for each phase
