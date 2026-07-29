# GameForge — Project Context for Claude Code

GameForge is a Steam-like digital game marketplace built as an internship
project for Surfboard Payments. The goal is to demonstrate real integration
with Surfboard's payments APIs, not just a checkout button.

**Timeline: 2-3 day build.** Prioritize a small number of features working
end-to-end over many features half-working. When in doubt, ship the
narrower, real version over the broader, mocked one.

---

## Stack

- **Frontend:** React (Vite) + TypeScript, in `client/`
- **Backend:** Node.js + Express + TypeScript, in `server/`
- **Database:** PostgreSQL, accessed via Prisma ORM
- **Auth:** JWT-based, role-gated middleware
- **Payments:** Surfboard Payments API (sandbox)

Do not introduce additional frameworks, state managers, or infra
(Redux, GraphQL, microservices, message queues, Docker orchestration)
unless explicitly asked. Keep the stack boring and shippable.

---

## Roles & Permissions

Three roles, stored on `User.role`: `CUSTOMER`, `PUBLISHER`, `ADMIN`.

**Customer**
- Browse games, purchase games, view library, view purchase history,
  redeem gift cards, request refunds

**Publisher**
- Register as publisher (triggers Surfboard merchant onboarding)
- Manage own store, upload/manage own games
- View sales and revenue (computed from local DB, not live Surfboard calls)

**Admin**
- Approve/manage publishers, manage games, create promotions,
  issue gift cards, monitor payments, view analytics

Route-level authorization must check both authentication (valid JWT) and
role (`requireRole('PUBLISHER')` etc.), and for publisher-owned resources,
ownership (a publisher can only edit their own games).

---

## Database Schema (Prisma models to implement)

- `User` (id, email, passwordHash, role, firstName, lastName)
- `Publisher` (id, userId, surfboardMerchantId, surfboardApplicationId,
  status: PENDING | APPROVED | REJECTED)
- `Store` (id, publisherId, surfboardStoreId)
- `Game` (id, publisherId, title, description, price, currency, status)
- `Order` (id, customerId, surfboardOrderId, status, totalAmount,
  currency, createdAt)
- `OrderItem` (id, orderId, gameId, priceAtPurchase)
- `Payment` (id, orderId, surfboardPaymentId, status, method)
- `Refund` (id, orderId, surfboardRefundId, status, reason, amount)
- `LibraryEntry` (id, customerId, gameId, orderId, acquiredAt)
- `GiftCard` (id, surfboardGiftCardId, code, initialBalance,
  currentBalance, status)
- `GiftCardRedemption` (id, giftCardId, orderId, amountApplied)
- `Promotion` (id, surfboardPromotionId, code, type, value, startsAt,
  endsAt, usageLimit)
- `PromotionUsage` (id, promotionId, orderId, discountApplied)
- `WebhookEvent` (id, eventType, surfboardReferenceId, payload,
  processedAt) — used for idempotency, see below

**Idempotency rule:** every webhook handler must check `WebhookEvent`
for a prior record of the same Surfboard event before applying any state
change. Surfboard webhooks may be delivered more than once.

---

## Surfboard API Integration Map

| Feature / Screen | Surfboard API | Notes |
|---|---|---|
| Publisher registration | Merchant API (`POST /partners/{partnerId}/merchants`) | Returns `applicationId` + `webKybUrl`, not a merchant ID yet |
| Publisher onboarding status | Merchant API (`GET /partners/{partnerId}/merchants/{applicationId}/status`) | Poll or webhook for `MERCHANT_CREATED`, which returns `merchantId` + `storeId` |
| Publisher store setup | Store API | Additional stores beyond the default one created during onboarding |
| Checkout / create order | Orders API (`POST /merchants/:merchantId/orders`) | Apply promo + gift card discounts to totals *before* this call |
| Checkout completion | Payment Page (hosted redirect) + Payments API status | Never trust the redirect alone — confirm server-side via webhook or status poll |
| Order/payment status updates | Webhooks | Verify signature; write to `WebhookEvent` before processing |
| Customer refund request | Refund API | Customer requests → Admin/Publisher approves in-app → then call Surfboard |
| Admin issues gift card | Gift Card API | Store returned `surfboardGiftCardId` + generated redemption code locally |
| Customer redeems gift card | Gift Card API | v1: gift card must fully cover order or isn't applied (no partial-split yet) |
| Admin creates promotion | Promotion API | Store code, discount type/value, validity window, usage limit locally |
| Checkout promo validation | Promotion API | Validate active/unexpired/under-limit at time of order creation, not just display time |

**All Surfboard calls must go through a single wrapper service:**
`server/src/services/surfboard.ts`. No ad-hoc `fetch`/`axios` calls to
Surfboard endpoints anywhere else in the codebase. This wrapper owns auth
header construction, base URL, and error normalization.

**Auth note:** confirm the exact request auth header format (API key +
secret) against the Postman collection / API reference in the Developer
Portal Console before implementing the wrapper — do not guess the header
scheme.

**KYB timing constraint:** real KYB review takes 3-4 business days.
For the live demo: show a *real* Create Merchant call firing when a new
publisher registers, but drive all downstream demo flows (catalog,
checkout) off one pre-approved test merchant created ahead of time.

---

## Post-Payment-Success Sequence (must be atomic / transactional)

On receiving a confirmed `PAYMENT_COMPLETED` webhook:

1. Idempotency check against `WebhookEvent` — no-op if already processed
2. Update `Order.status` and `Payment.status`
3. Create `LibraryEntry` rows for each game in the order
4. Confirm/finalize gift card balance deduction, if used
5. Increment `PromotionUsage`, if a promo was used
6. Push status update to the customer's UI (poll or push — see below)
7. Publisher revenue figures update automatically since they're derived
   from `Order`/`OrderItem`, not a separate write

---

## Build Order (do not reorder without discussion)

**Phase 1 — Foundation**
1. Repo scaffold (`server/`, `client/`), Postgres connection, `.env`,
   `.gitignore`
2. Prisma schema + migration for all models above
3. Seed script with test users/games

**Phase 2 — Core App (no Surfboard yet)**
4. Auth: signup/login, JWT, `requireAuth` / `requireRole` middleware
5. Game catalog CRUD (publisher create/edit, customer browse/detail)

**Phase 3 — Surfboard Integration (core differentiator, most time)**
6. `SurfboardClient` service with confirmed auth
7. Publisher onboarding (Create Merchant → KYB link → status polling)
   + pre-onboarded fallback merchant for demo
8. Checkout: Create Order → Payment Page redirect → webhook receiver
   (with signature verification + idempotency) → status push to
   frontend → library entry creation on success

**Phase 4 — Remaining Features**
9. Refunds (request → approve → Surfboard Refund API → webhook)
10. Gift cards (admin issue → customer redeem at checkout)
11. Promotions (admin create → validated at checkout)
12. Admin analytics (one sales chart, one revenue-per-publisher table,
    computed from local DB)

**Phase 5 — Polish**
13. Error/loading states, basic responsive layout
14. Rehearse the 5-minute demo script end-to-end, twice

If time runs short, drop in this order: promotions → partial gift-card
splitting → admin analytics polish. Do not cut refunds or the core
checkout/webhook loop — that's the credibility centerpiece of the demo.

---

## Live status updates

Default to short-polling an order-status endpoint (1-2s interval) while
the customer is on the checkout confirmation screen. Only build a
WebSocket/SSE channel if time allows — it's a nice upgrade, not a
requirement.

---

## Demo Script (5 minutes) — build toward this, not beyond it

1. Publisher registers → real Merchant API call fires → admin approves (30s)
2. Publisher uploads a game, appears in storefront (30s)
3. Customer applies promo + gift card, checks out via Surfboard sandbox
   Payment Page (90s)
4. Webhook fires live, order status updates in UI without refresh (60s)
5. Customer requests refund → admin approves → refund completes →
   webhook confirms (60s)
6. Publisher revenue + admin analytics glance (30s)

---

## Conventions

- Never commit `.env` or log API keys/secrets
- All money amounts: store as integers (minor units, e.g. cents/öre) to
  avoid float rounding issues, matching Surfboard's own amount format
- Every Surfboard-facing write operation should be idempotent or guarded
  against duplicate submission (double-click, retry, etc.)
- Keep this file updated as decisions change — it is the source of truth
  for architecture decisions across sessions
