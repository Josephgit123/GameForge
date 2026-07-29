# Architecture

## Roles

Three roles, stored on `User.role`. See [DATABASE.md](DATABASE.md#user) for
the schema and [API_INTEGRATION.md](API_INTEGRATION.md) for how each role's
actions map to Surfboard API calls.

| Role | Can do |
|---|---|
| **CUSTOMER** | Browse games, purchase games, view library, view purchase history, redeem gift cards, request refunds |
| **PUBLISHER** | Register as publisher (triggers Surfboard merchant onboarding), manage own store, upload/manage own games, view sales and revenue (computed from local DB, not live Surfboard calls) |
| **ADMIN** | Approve/manage publishers, manage games, create promotions, issue gift cards, monitor payments, view analytics |

Every route checks, in order: **authentication** (valid JWT) →
**role** (`requireRole('PUBLISHER')`, etc.) → **ownership**, where
applicable (a publisher can only edit their own `Game`/`Store` rows — the
check compares the resource's `publisherId` against the authenticated
user's own `Publisher.id`, not just their role).

## Client structure

> CLAUDE.md doesn't state whether each role gets a physically separate
> frontend or a single app with role-based routing. This doc assumes the
> latter — **one Vite/React app in `client/`**, with routes/views gated by
> the JWT's role claim, since CLAUDE.md only names one `client/` directory
> and one frontend stack. **(assumption — confirm)**

Within that single app, think of it as three role-scoped "portals" sharing
the same codebase, router, and API client:

- **Customer portal** — storefront, game detail, checkout, library, order
  history, refund requests
- **Publisher portal** — onboarding status, store/game management, sales
  view
- **Admin portal** — publisher approval queue, game moderation, promotions,
  gift cards, payment monitoring, analytics

All three talk to the **same** Express backend and the **same** Postgres
database — there is no per-role backend or per-role database. Role
separation is enforced entirely by JWT + middleware on the server, not by
network topology.

## System diagram (in words)

```
┌──────────────┐        HTTPS/JSON         ┌───────────────────┐
│   client/    │ ────────────────────────▶ │     server/       │
│ React + Vite │ ◀──────────────────────── │ Express + TS       │
│ (3 role-     │      JWT-authenticated     │ requireAuth /       │
│  scoped UIs) │        REST calls          │ requireRole        │
└──────────────┘                            └─────────┬─────────┘
                                                        │ Prisma
                                                        ▼
                                             ┌───────────────────┐
                                             │    PostgreSQL      │
                                             │ (single DB, all     │
                                             │  models below)      │
                                             └─────────┬─────────┘
                                                        ▲
                                                        │ reads/writes
                                                        │ Surfboard IDs
                                             ┌─────────┴─────────┐
                                             │ SurfboardClient     │
                                             │ (server/src/        │
                                             │  services/           │
                                             │  surfboard.ts)       │
                                             └─────────┬─────────┘
                                                        │ HTTPS
                                                        ▼
                                             ┌───────────────────┐
                                             │  Surfboard APIs     │
                                             │ Merchant / Store /  │
                                             │ Orders / Payments / │
                                             │ Refund / Gift Card /│
                                             │ Promotion           │
                                             └─────────┬─────────┘
                                                        │ async webhook
                                                        │ (signed payload)
                                                        ▼
                                             ┌───────────────────┐
                                             │ Webhook receiver     │
                                             │ (Express route in    │
                                             │  server/)             │
                                             │ 1. verify signature   │
                                             │ 2. idempotency check  │
                                             │    (WebhookEvent)     │
                                             │ 3. apply state change │
                                             └─────────┬─────────┘
                                                        │
                                                        ▼
                                             (writes back into the
                                              same Postgres DB above)
```

Two request paths hit the backend:

1. **Synchronous, client-initiated** — client → server (JWT-checked) →
   Postgres, and for Surfboard-backed actions, server → `SurfboardClient` →
   Surfboard API → response returned inline (e.g. Create Merchant, Create
   Order).
2. **Asynchronous, Surfboard-initiated** — Surfboard → webhook receiver →
   Postgres. The client only learns about these state changes by polling an
   order-status endpoint (see "Live status updates" below), not by a direct
   push from Surfboard.

The client never talks to Surfboard directly except by following the
Payment Page hosted redirect URL that the server hands it — all Surfboard
API calls, including reading the eventual result, are server-mediated.

## Live status updates

Default: the client short-polls an order-status endpoint every 1-2 seconds
while the customer sits on the checkout confirmation screen, until the
order reaches a terminal status. A WebSocket/SSE channel is an optional
upgrade if time allows, not a requirement (per CLAUDE.md).

## The SurfboardClient wrapper pattern

All Surfboard calls — Merchant, Store, Orders, Payments, Refund, Webhooks
(verification), Gift Card, Promotion — must go through one module:
`server/src/services/surfboard.ts`. No route handler, controller, or job
may call `fetch`/`axios` against a Surfboard endpoint directly.

**Why this matters here specifically:**

- **Auth header format is a single unresolved unknown** (see
  [API_INTEGRATION.md](API_INTEGRATION.md#auth)) — CLAUDE.md is explicit that
  the exact key+secret header scheme must be confirmed against the Postman
  collection before implementing, not guessed. Centralizing it means that
  confirmation is a one-file change instead of a find-and-replace across the
  codebase.
- **Idempotency and retries are a system-wide requirement** (per the
  Conventions section: every Surfboard-facing write must be idempotent or
  guarded against duplicate submission). A single wrapper is the one place
  to add retry/backoff or duplicate-submission guards consistently, instead
  of re-implementing it per call site.
- **Error normalization** — Surfboard error responses need to become a
  consistent shape before they reach route handlers, so the rest of the app
  doesn't need to know Surfboard's specific error format.
- **Base URL and environment switching** — sandbox vs. any future
  production base URL is a single config point instead of scattered
  `env.SURFBOARD_...` reads.
- **Auditability** — with one call path, it's straightforward to log every
  outbound Surfboard request/response in one place for debugging the demo.
