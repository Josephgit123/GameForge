# Surfboard API Integration

All calls below go through `server/src/services/surfboard.ts` — see
[ARCHITECTURE.md](ARCHITECTURE.md#the-surfboardclient-wrapper-pattern) for
why. Nothing in this doc should be implemented against ad-hoc `fetch` calls
elsewhere in the codebase.

<a id="auth"></a>
## Auth (unconfirmed — do not guess)

CLAUDE.md is explicit: **confirm the exact request auth header format (API
key + secret) against the Postman collection / API reference in the
Developer Portal Console before implementing the wrapper.** This doc does
not specify a header scheme because CLAUDE.md doesn't either. Whatever is
confirmed should be documented here and implemented in exactly one place
(`surfboard.ts`).

---

## Feature / screen → API map

| Feature / Screen | Surfboard API | Notes |
|---|---|---|
| Publisher registration | Merchant API — `POST /partners/{partnerId}/merchants` | Returns `applicationId` + `webKybUrl`, not a merchant ID yet |
| Publisher onboarding status | Merchant API — `GET /partners/{partnerId}/merchants/{applicationId}/status` | Poll or webhook for `MERCHANT_CREATED`, which returns `merchantId` + `storeId` |
| Publisher store setup | Store API | Additional stores beyond the default one created during onboarding |
| Checkout / create order | Orders API — `POST /merchants/:merchantId/orders` | Apply promo + gift card discounts to totals *before* this call |
| Checkout completion | Payment Page (hosted redirect) + Payments API status | Never trust the redirect alone — confirm server-side via webhook or status poll |
| Order/payment status updates | Webhooks | Verify signature; write to `WebhookEvent` before processing |
| Customer refund request | Refund API | Customer requests → Admin/Publisher approves in-app → then call Surfboard |
| Admin issues gift card | Gift Card API | Store returned `surfboardGiftCardId` + generated redemption code locally |
| Customer redeems gift card | Gift Card API | v1: gift card must fully cover order or isn't applied (no partial-split yet) |
| Admin creates promotion | Promotion API | Store code, discount type/value, validity window, usage limit locally |
| Checkout promo validation | Promotion API | Validate active/unexpired/under-limit at time of order creation, not just display time |

---

## Page-level API map

The feature-level map above groups by action; this groups the same information
by screen, so it's clear at a glance which pages actually touch Surfboard and
which are pure local CRUD. Page names are **(proposed — confirm)** — CLAUDE.md
doesn't name specific screens, these are derived from the role capabilities in
[ARCHITECTURE.md](ARCHITECTURE.md#client-structure).

### Shared

| Page | Surfboard API(s) |
|---|---|
| Login / Signup | none — local JWT only |

### Customer portal

| Page | Surfboard API(s) | What happens |
|---|---|---|
| Storefront | none | reads local `Game` table |
| Game Detail | none | reads local `Game` table |
| Checkout | Promotion API → Gift Card API → Orders API (`POST /merchants/:merchantId/orders`) → Payment Page (hosted redirect) | validate promo → validate gift card covers total → create order, get `surfboardOrderId` → redirect to hosted payment |
| Order Status | Payments API (status, fallback) + Webhooks (primary path) | page short-polls a local status endpoint; that endpoint's data is updated server-side by the `PAYMENT_COMPLETED` webhook (or a direct Payments API status call as fallback) |
| Library | none | reads local `LibraryEntry`, populated post-payment |
| Order History | none to view; Refund API fires later, not from here | refund request here just creates a local `Refund` row (`REQUESTED`) — no Surfboard call yet |

### Publisher portal

| Page | Surfboard API(s) | What happens |
|---|---|---|
| Publisher Registration | Merchant API — `POST /partners/{partnerId}/merchants` | returns `applicationId` + `webKybUrl` |
| Onboarding Status | Merchant API — `GET /partners/{partnerId}/merchants/{applicationId}/status` (poll) or Webhook (`MERCHANT_CREATED`) | returns `merchantId` + `storeId` once KYB clears |
| My Games | none | local `Game` CRUD |
| My Store | Store API | only for stores beyond the default one created during onboarding |
| Sales & Revenue | none | derived from local `Order`/`OrderItem`, explicitly not a live Surfboard call per CLAUDE.md |

### Admin portal

| Page | Surfboard API(s) | What happens |
|---|---|---|
| Publisher Approvals | none directly | flips local `Publisher.status`; depends on `surfboardMerchantId` already set by the Merchant API earlier |
| Game Moderation | none | local `Game` management |
| Promotions | Promotion API | create → stores `surfboardPromotionId` |
| Gift Cards | Gift Card API | issue → stores `surfboardGiftCardId`, generates local redemption code |
| Refund Approvals | Refund API + Webhook (confirmation) | Surfboard call fires only *after* admin approves here, not on the customer's request alone |
| Payments Monitor | none directly | reads local `Payment`/`Order` rows, which are populated via webhooks |
| Analytics | none | local aggregation over `Order`/`OrderItem` |

Net: of the pages listed, only about a third call a Surfboard API directly —
Checkout, Order Status, Publisher Registration, Onboarding Status, My Store,
Promotions, Gift Cards, and Refund Approvals. Everything else is local
CRUD/reads, with Surfboard's async webhooks doing the rest of the work behind
the scenes.

---

## Per-API detail

### Merchant API

- **Endpoints:** `POST /partners/{partnerId}/merchants` (create),
  `GET /partners/{partnerId}/merchants/{applicationId}/status` (poll)
- **Triggered by:** a user submitting the "Register as Publisher" form.
- **Response fields stored:**
  - On create: `applicationId` → `Publisher.surfboardApplicationId`,
    `webKybUrl` → shown to the user, not persisted (or persisted transiently
    if you want to let them resume KYB later — **(proposed — confirm)**,
    CLAUDE.md doesn't say whether `webKybUrl` needs to survive a page
    refresh).
  - On `MERCHANT_CREATED` (via poll or webhook, whichever fires first):
    `merchantId` → `Publisher.surfboardMerchantId`, `storeId` → a `Store`
    row's `surfboardStoreId`, and `Publisher.status` moves toward
    `APPROVED` (still gated on local admin approval per CLAUDE.md's role
    table — **(proposed — confirm)** whether `MERCHANT_CREATED` alone is
    sufficient or whether an admin must also click approve; CLAUDE.md lists
    "Approve/manage publishers" as an Admin action, implying a manual step
    exists independent of Surfboard's own KYB result).

### Store API

- **Triggered by:** a publisher creating a second (or later) store beyond
  the default one Surfboard creates during onboarding.
- **Response fields stored:** `surfboardStoreId` → new `Store` row.

### Orders API

- **Endpoint:** `POST /merchants/:merchantId/orders`
- **Triggered by:** customer clicking "Checkout."
- **Before calling:** compute `Order.totalAmount` locally — apply promotion
  discount and gift card coverage first, so the amount sent to Surfboard is
  already final.
- **Response fields stored:** `surfboardOrderId` → `Order.surfboardOrderId`.

### Payment Page + Payments API

- **Triggered by:** immediately after order creation succeeds — server
  hands the client a hosted Payment Page redirect URL.
- **On redirect return:** do **not** trust the redirect alone (a user can
  navigate back/forward or the browser tab can close). Confirm the actual
  payment result server-side via the Payments API status call or, more
  reliably, wait for the webhook.
- **Response fields stored:** `surfboardPaymentId` → `Payment.surfboardPaymentId`,
  `status` → `Payment.status`.

### Webhooks

- **Triggered by:** Surfboard, asynchronously, for order/payment/merchant/refund
  status changes.
- **Handler must, in order:** verify signature → idempotency check against
  `WebhookEvent` (see [DATABASE.md](DATABASE.md#idempotency-pattern)) → apply
  state change → mark `WebhookEvent.processedAt`.
- **Fields stored:** raw payload → `WebhookEvent.payload`; `eventType` and
  the referenced entity ID → `WebhookEvent.surfboardReferenceId`; then
  whatever the specific event implies (e.g. `PAYMENT_COMPLETED` → see the
  post-payment sequence below).

### Refund API

- **Triggered by:** only after a customer's refund request has been
  approved in-app by an Admin or the owning Publisher — Surfboard is never
  called on the customer's request alone.
- **Response fields stored:** `surfboardRefundId` → `Refund.surfboardRefundId`,
  `status` → `Refund.status`. A `REFUND_COMPLETED`-style webhook (exact
  event name **(proposed — confirm)**) should confirm completion the same
  way `PAYMENT_COMPLETED` does for orders — don't mark a refund complete
  purely off the synchronous API response.

### Gift Card API

- **Triggered by:** Admin issuing a new gift card.
- **Response fields stored:** `surfboardGiftCardId` → `GiftCard.surfboardGiftCardId`.
  The redemption `code` shown to customers is generated and stored locally
  (format **(proposed — confirm)**, not specified in CLAUDE.md).
- **Redemption (customer, at checkout):** v1 constraint — a gift card must
  fully cover the order total or it isn't applied at all; no partial-split
  between gift card and card payment yet. Balance deduction is only
  *finalized* on payment success (step 4 of the post-payment sequence) —
  don't decrement `currentBalance` at the moment of applying the code,
  only once the order actually completes, to avoid stranding balance on an
  abandoned checkout.

### Promotion API

- **Triggered by:** Admin creating a promotion (code, discount type/value,
  validity window, usage limit — all stored locally, plus whatever ID
  Surfboard's Promotion API returns).
- **Response fields stored:** `surfboardPromotionId` → `Promotion.surfboardPromotionId`.
- **Checkout-time validation:** re-validate active/unexpired/under-limit at
  order-creation time, not just when the code was first displayed to the
  customer — a promo can expire or hit its usage limit between page load
  and checkout.

---

## Merchant onboarding sequence (detailed)

1. User submits "Register as Publisher" → server calls Merchant API
   `POST /partners/{partnerId}/merchants`.
2. Response returns `applicationId` and `webKybUrl`. Server creates a
   `Publisher` row with `surfboardApplicationId` set, `surfboardMerchantId`
   still null, `status = PENDING`. Client redirects the user to
   `webKybUrl` to complete Know-Your-Business verification with Surfboard.
3. Server polls `GET /partners/{partnerId}/merchants/{applicationId}/status`
   (interval **(proposed — confirm)**, not specified in CLAUDE.md — a
   webhook for the same transition may arrive first and should short-circuit
   the poll) until the status reaches `MERCHANT_CREATED`.
4. On `MERCHANT_CREATED`: response includes `merchantId` and `storeId`.
   Server writes `surfboardMerchantId` onto `Publisher` and creates the
   default `Store` row with `surfboardStoreId`.
5. Admin still reviews and approves the publisher in-app (`Publisher.status`
   → `APPROVED`) — this is a separate local gate from Surfboard's own KYB
   result, per the Admin role's "approve/manage publishers" responsibility.
6. Only after local `APPROVED` (and a real `surfboardMerchantId`) can the
   publisher's games appear for purchase and route orders through their
   merchant account.

### KYB timing constraint and the demo fallback

Real KYB review takes **3-4 business days** — far longer than the 2-3 day
build window or the 5-minute demo. Strategy:

- The registration flow above is implemented for real and does fire a real
  Create Merchant call live during the demo (step 1 of the
  [demo script](DEMO_SCRIPT.md)) — this is what proves the integration is
  real, not mocked.
- However, none of the *downstream* demo flows (catalog browsing, checkout,
  payment, webhook, refund) wait on that freshly-created merchant's KYB to
  actually clear. Instead, a **separate merchant is created ahead of time**,
  manually pushed through KYB in advance of the demo, and its
  `merchantId` is hardcoded via `SURFBOARD_DEMO_FALLBACK_MERCHANT_ID` (see
  [.env.example](../.env.example)).
- All demo games are associated with that pre-approved fallback merchant
  (or a `Publisher`/`Store` row pointing at it), so checkout, payment, and
  webhook flows during the demo run against a merchant that's actually
  live in Surfboard's sandbox, not a freshly-registering one still stuck in
  `PENDING`.
- **(proposed — confirm)** exactly how the fallback merchant is wired into
  seed data — e.g. a seeded `Publisher` row with `surfboardMerchantId`
  pre-populated from the env var — isn't specified in CLAUDE.md; this is a
  seed-script implementation detail to settle in [SETUP.md](SETUP.md).

---

## Post-payment-success sequence (step by step)

Fires on a confirmed `PAYMENT_COMPLETED` webhook. Must run atomically —
wrap steps 2-5 in a single DB transaction.

1. **Idempotency check** against `WebhookEvent` — if this event was already
   processed, no-op and return 200 immediately. See
   [DATABASE.md](DATABASE.md#idempotency-pattern).
2. **Update status** — `Order.status` and `Payment.status` both move to
   their completed values.
3. **Create `LibraryEntry` rows** — one per `OrderItem` in the order, so
   the customer's library reflects every game just purchased.
4. **Finalize gift card deduction** — if a `GiftCardRedemption` row exists
   for this order, decrement `GiftCard.currentBalance` by
   `amountApplied` now (not earlier — see the Gift Card API notes above).
5. **Increment `PromotionUsage`** — if a promo was used on this order,
   record the usage row now, counting it against `usageLimit`.
6. **Push status to the customer's UI** — the client's short-poll against
   the order-status endpoint will pick up the new `Order.status` on its
   next tick (1-2s interval); no separate push mechanism is required unless
   a WebSocket/SSE upgrade is built.
7. **Publisher revenue updates automatically** — no separate write needed;
   revenue is always derived from `Order`/`OrderItem` at read time.
8. **Mark `WebhookEvent.processedAt`** — commits the idempotency lock,
   ideally in the same transaction as steps 2-5.
