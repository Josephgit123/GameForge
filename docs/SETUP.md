# Local Development Setup

Detailed version of the [README](../README.md#setup) setup steps. Run
everything from the repo root unless a step says otherwise.

## 1. Prerequisites

- Node.js — version **(proposed — confirm)**; CLAUDE.md doesn't pin one.
  Use the latest active LTS (Node 20.x as of writing) unless the team
  settles on something else.
- PostgreSQL — version **(proposed — confirm)**, not specified in CLAUDE.md.
  Any recent PostgreSQL (14+) should work fine with Prisma.
- A Surfboard Developer Portal Console account with sandbox access (see
  step 4).
- `git`.

## 2. Clone and install dependencies

```bash
git clone <repo-url> gameforge
cd gameforge
```

Install server and client dependencies separately — they're two independent
`package.json`s, not a monorepo workspace (CLAUDE.md doesn't specify a
workspace tool like npm/pnpm/yarn workspaces, so treat them as standalone):

```bash
cd server && npm install
cd ../client && npm install
```

## 3. Configure environment variables

Copy the root [.env.example](../.env.example) and split it into
`server/.env` and `client/.env` per the section headers in that file:

```bash
cp .env.example server/.env
cp .env.example client/.env
```

Then edit each copy down to only the variables under its respective
section header — `server/.env` doesn't need `VITE_API_BASE_URL`, and
`client/.env` should only ever contain `VITE_`-prefixed vars (Vite ignores
everything else and you don't want Surfboard secrets anywhere near
client-bundled code).

## 4. Get Surfboard sandbox credentials

1. Sign up / log in to the Surfboard Developer Portal Console.
2. Create a sandbox API key + secret.
3. **Before wiring these into `surfboard.ts`**, find the Postman collection
   or API reference in the Console and confirm the exact auth header format
   — CLAUDE.md flags this as unconfirmed, don't guess it. Record the
   confirmed scheme at the top of
   [API_INTEGRATION.md](API_INTEGRATION.md#auth) once known.
4. Note your **partner ID** — this is the `{partnerId}` path segment used in
   Merchant API calls. Set it as `SURFBOARD_PARTNER_ID`.
5. Set `SURFBOARD_API_KEY`, `SURFBOARD_API_SECRET`, `SURFBOARD_API_BASE_URL`,
   and `SURFBOARD_PARTNER_ID` in `server/.env`.
6. For webhooks in local dev, Surfboard needs a publicly reachable URL to
   call. Use a tunnel (e.g. `ngrok http 4000`) and set the resulting URL as
   `SURFBOARD_WEBHOOK_URL`, then register it in the Console against your
   sandbox app. Set `SURFBOARD_WEBHOOK_SECRET` to whatever signing secret
   the Console gives you for verifying incoming payloads.
7. Ahead of the demo, create and manually push through KYB a **second**,
   pre-approved sandbox merchant. Set its ID as
   `SURFBOARD_DEMO_FALLBACK_MERCHANT_ID` — see
   [API_INTEGRATION.md](API_INTEGRATION.md#kyb-timing-constraint-and-the-demo-fallback).

## 5. Set up Postgres

Create a local database matching `DATABASE_URL` in `server/.env`:

```bash
# using psql
psql -U postgres -c "CREATE DATABASE gameforge;"
```

Or point `DATABASE_URL` at whatever Postgres instance you already have
running (Docker container, local install, hosted dev instance) — Prisma
only cares that the connection string resolves.

## 6. Run Prisma migrations

From `server/`:

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

`migrate dev` creates the schema from `prisma/schema.prisma` (built from the
model list in [DATABASE.md](DATABASE.md)) and applies it to the database in
`DATABASE_URL`. `generate` regenerates the Prisma Client — re-run it any
time the schema changes.

## 7. Seed data

```bash
npx prisma db seed
```

The seed script should create, at minimum: one `ADMIN` user, one
`PUBLISHER` user with a `Publisher` row wired to
`SURFBOARD_DEMO_FALLBACK_MERCHANT_ID` (see step 4.7 and
[API_INTEGRATION.md](API_INTEGRATION.md)), a handful of `Game` rows under
that publisher, and one `CUSTOMER` user to log in as during the demo.
**(proposed — confirm)** exact seed data isn't specified in CLAUDE.md beyond
"test users/games" (Build Order, Phase 1, step 3) — flesh out the specific
list as the seed script is written.

## 8. Configure the Surfboard MCP server (`.mcp.json`)

If Surfboard publishes an MCP server for querying their API docs from
inside Claude Code, add it to a repo-root `.mcp.json`:

```json
{
  "mcpServers": {
    "surfboard-docs": {
      "command": "REPLACE_WITH_ACTUAL_COMMAND",
      "args": ["REPLACE_WITH_ACTUAL_ARGS"],
      "env": {
        "SURFBOARD_API_KEY": "${SURFBOARD_API_KEY}"
      }
    }
  }
}
```

**(proposed — confirm)**: CLAUDE.md doesn't name a specific Surfboard MCP
server package, command, or transport (stdio vs. HTTP). Find the actual
entry in the Developer Portal Console or Surfboard's docs and replace the
placeholders above — don't invoke this config until the real command/args
are confirmed, since a guessed command will just fail to start.

## 9. Start both dev servers

In two terminals:

```bash
cd server && npm run dev
cd client && npm run dev
```

Confirm the server is up on `http://localhost:4000` (or your `PORT`) and
the client on `http://localhost:5173` (Vite default), and that
`CORS_ORIGIN` / `VITE_API_BASE_URL` match each other.

---

## Common setup errors

Placeholders below — fill in with the actual error text, cause, and fix as
they come up during the build. Don't invent fixes for errors that haven't
happened yet.

### Prisma can't reach the database
- **Error:** _(paste exact error once hit)_
- **Cause:** _(TBD)_
- **Fix:** _(TBD)_

### Webhook signature verification fails locally
- **Error:** _(paste exact error once hit)_
- **Cause:** _(TBD — likely candidates: tunnel URL mismatch, wrong secret,
  clock skew, or a payload-encoding mismatch between what Surfboard signs
  and what the receiver hashes — confirm against actual behavior)_
- **Fix:** _(TBD)_

### CORS errors between client and server
- **Error:** _(paste exact error once hit)_
- **Cause:** _(TBD)_
- **Fix:** _(TBD)_

### Surfboard API calls return an auth error
- **Error:** _(paste exact error once hit)_
- **Cause:** _(TBD — most likely the header format guessed before
  confirming against the Postman collection, see step 4.3 above)_
- **Fix:** _(TBD)_
