# Surfboard API Integration

All calls below go through `server/src/services/surfboard.ts` — see
[ARCHITECTURE.md](ARCHITECTURE.md#the-surfboardclient-wrapper-pattern) for
why. Nothing in this doc should be implemented against ad-hoc `fetch` calls
elsewhere in the codebase.

<a id="auth"></a>
## Auth (confirmed)

Three literal headers, verified against Surfboard's own API reference and a
real live call:

```
Content-Type: application/json
API-KEY: <api key>
API-SECRET: <api secret>
```

`MERCHANT-ID` is added as a fourth header only for merchant-scoped calls
(Orders, Payments) once a `merchantId` exists — Create Merchant itself is
partner-scoped and doesn't send it. Implemented in exactly one place,
`server/src/services/surfboard.ts`.

Base API URL (same for Demo and Live — the key/secret pair determines which
environment you hit, not the URL): `https://carbon.surfgw.com/api`.

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

**Confirmed live, corrections to the endpoint path:** the actual API does
not nest orders under `/merchants/:merchantId/orders` (that 404s) — it's a
flat `POST /orders`, with `MERCHANT-ID` sent only as a header, same as every
other merchant-scoped call. `GET /orders/:orderId/status` is flat the same
way. This is exactly what `server/src/services/surfboard.ts` implements;
CLAUDE.md's original endpoint sketch was wrong on this one detail.

- **Prerequisite — terminal:** an order is created against a `terminal$id`.
  A terminal must be registered first via
  `POST /merchants/:merchantId/stores/:storeId/online-terminals` with
  `{ "onlineTerminalMode": "PaymentPage" }` — confirmed live, returns a
  `terminalId`. Register once per store and cache the ID (re-registering
  isn't idempotent — it mints a new terminal each time).
- **Endpoint:** `POST /orders` (`MERCHANT-ID` header only, not in the path)
- **Triggered by:** customer clicking "Checkout."
- **Before calling:** compute `Order.totalAmount` locally — apply promotion
  discount and gift card coverage first, so the amount sent to Surfboard is
  already final.
- **Currency gotcha, confirmed live:** Surfboard wants the **numeric ISO
  4217 code** (`"752"` for SEK), not an alpha code (`"USD"` fails with
  `OR_0004: currency code is not associated with this merchant`) — and it
  must match whatever currency the merchant's country/acquirer config
  supports. Our demo merchant is Swedish (`country: "SE"`), so it's SEK-only.
  This is a real mismatch with `Game.currency` in our schema (currently
  seeded as the string `"USD"`) that needs resolving before real checkout
  can run — either reseed demo games in SEK, or add a currency-code mapping
  layer in `surfboard.ts`.
- **Response fields stored:** `orderId` → `Order.surfboardOrderId`.

### Payment Page

**Confirmed live — simpler than originally documented:** for a
`PaymentPage`-mode terminal, the Create Order response includes
**`paymentPageLink` directly** — there is no separate Initiate Payment call
in this flow. `POST /payments` (Initiate Payment) exists in Surfboard's API
but is for a different path (e.g. charging a saved token) and isn't part of
GameForge's checkout.

- **Triggered by:** immediately after order creation succeeds — server
  hands the client `paymentPageLink` to redirect to.
- **On redirect return:** do **not** trust the redirect alone (a user can
  navigate back/forward or the browser tab can close). Confirm the actual
  payment result server-side via `GET /orders/:orderId/status` or, more
  reliably, wait for the webhook.
- **Response fields stored:** once the order completes, `Payment.status` is
  set from the order status response's `payments[].paymentStatus`;
  `Payment.surfboardPaymentId` from `payments[].paymentId`.

### Webhooks

**Confirmed live** (built and tested end-to-end in
`server/src/routes/webhooks.ts`, including a self-signed test payload):

- **Endpoint:** `POST /webhooks/surfboard`
- **Signature:** header `x-webhook-signature`, value = HMAC-SHA512 of the
  *raw* request body string (not the parsed/re-serialized JSON), keyed with
  the webhook secret from the Console, base64-encoded. Verified with
  `timingSafeEqual` in `server/src/lib/webhookSignature.ts`. Express's
  `express.json({ verify })` hook captures the raw bytes onto `req.rawBody`
  before parsing — this has to happen before the idempotency check, or an
  unverified payload could poison the database.
- **Idempotency key:** `metadata.eventId` from the payload → `WebhookEvent.surfboardEventId`
  (`@unique` in the schema) — see [DATABASE.md](DATABASE.md#idempotency-pattern).
  Tested live: resending the identical event returns `{"status":"already processed"}`
  and makes zero additional DB writes.
- **Event type for payment completion:** `order.paymentcompleted` (not
  `PAYMENT_COMPLETED` — that's the *status* value inside the payload, e.g.
  `data.paymentStatus`). CLAUDE.md's phrasing was a simplification.
- **Fields stored:** raw payload → `WebhookEvent.payload`; `eventType` →
  `WebhookEvent.eventType`; `data.orderId` → `WebhookEvent.surfboardReferenceId`.
- **Must set up in the Console before it works for real:** the endpoint
  needs a publicly reachable URL (a local tunnel like ngrok in dev) to
  register in the Surfboard Console's webhook config, which is what actually
  issues the real signing secret — see [SETUP.md](SETUP.md). Everything
  above was verified with a locally-generated test secret and a hand-signed
  payload, not a live webhook delivery yet.

### Refund API

**Confirmed live, built and tested in `server/src/routes/refunds.ts`.**
There's no dedicated Refunds API — a refund is **a new order**, with
negative `quantity`/`amount.total` per line and each line's
`purchaseOrderId` pointing back at the original order's `surfboardOrderId`.
Reuses `createOrder()`, same as checkout.

- **Triggered by:** only after a customer's refund request has been
  approved in-app by an Admin or the owning Publisher — Surfboard is never
  called on the customer's request alone.
- **Request:** `POST /orders` (same flat endpoint as checkout) with
  `controlFunctions.initiatePaymentsOptions.paymentMethod: "CARD_NP"` (the
  recommended refund method for an original `CARD` payment — confirmed in
  `web-guides/refund-an-order.md`) and `callBackUrl` set the same way as a
  normal checkout order, for webhook confirmation.
- **Response fields stored:** the refund order's own `orderId` →
  `Refund.surfboardRefundId`. This is a *different* Surfboard order ID than
  the original purchase — the webhook receiver has to check both `Order`
  and `Refund` by `surfboardOrderId`/`surfboardRefundId` to know which one
  a given `order.paymentcompleted` event belongs to (see
  `webhooks.ts#handlePaymentCompleted`).
- **Confirmed real business rule (`OR_0035`):** Surfboard refuses to refund
  an order whose status on *their* side isn't completed — `"Cannot refund
  from purchase order that is not completed. Status: PENDING"`. Seen two
  distinct ways in testing, both confirming the refund code is correctly
  checking Surfboard's real state, not a bug in our code:
  1. Our local order was only marked `PAID` via a simulated webhook, never
     actually completed on Surfboard's side (same root cause as the missing
     test-card gap in Phase 3).
  2. **(2026-07-30, genuinely real card charge)** A real Mastercard sandbox
     purchase completed (`orderStatus: PAYMENT_COMPLETED`, `voided: false`)
     and still hit `OR_0035` on refund. The order's `settlementStatus` was
     `"NOT_SETTLED"` — Surfboard only allows refunding a transaction that
     has actually **settled**, which is a separate batch step (often hours
     or overnight) distinct from authorization/completion. A same-day
     sandbox test charge won't have settled yet, so refund approval on it
     will keep failing regardless of retries. Known gap for demo day — see
     DEMO_SCRIPT.md's Phase 5 fallback.
- **Two real bugs found and fixed while testing this:**
  1. Surfboard sometimes returns business-logic errors as **HTTP 200** with
     `{status: "ERROR", message}` and no `data` field — not just via
     non-2xx status codes. `surfboard.ts`'s `request()` now checks
     `body.status === 'ERROR'` in addition to `!res.ok`, so callers never
     get a silently-undefined `data`.
  2. A caught-but-rethrown unexpected error in the refund route crashed the
     **entire server process**, not just that request, since there was no
     global Express error handler and Express 4 doesn't auto-catch async
     rejections. Added `asyncHandler` (`server/src/lib/asyncHandler.ts`) —
     now applied to every route — plus a catch-all error middleware in
     `index.ts`.
- Refund timelines by method (from the same guide): card refunds take up to
  7 days, Swish/Vipps are instant, MobilePay up to 10 banking days, Klarna
  up to 10 days. Refunds can only be issued within 90 days of purchase —
  enforced by Surfboard, not us.

### Receipts API

**Built in `server/src/services/surfboard.ts` (`emailReceipt`, `getReceiptLink`)
and wired into `webhooks.ts` (auto-email on `PAYMENT_COMPLETED`) and
`checkout.ts` (`GET /:orderId/receipt-link`) — code reaches Surfboard for
real, but hits the same settlement gap as refunds.**

- Only the two endpoints relevant to a purely digital storefront are
  wrapped — `PUT /receipts/{id}/email` and `GET /receipts/{id}/link`. The
  rest (cash-register fiscal fields, terminal printing, raw ESC/POS) assume
  physical retail hardware GameForge doesn't have.
- `{id}` accepts a Transaction ID, Payment ID, or Order ID per the docs.
- **Confirmed live — same root cause as the `OR_0035` refund gap above:**
  tried all three ID types against a real, genuinely-completed card
  purchase (`orderStatus: PAYMENT_COMPLETED`) — every one came back
  `{"status":"ERROR","message":"No Completed transaction found for the
  given ID"}`. That order's `settlementStatus` was `"NOT_SETTLED"`, same as
  every sandbox transaction seen in this project so far. Strongly suggests
  receipts also require a **settled** transaction, not just a completed
  payment — not something fixable from our side; a sandbox transaction
  that never settles means this can't be live-verified end-to-end until
  that's resolved (possibly requires Surfboard support, same class of gap
  as the missing test card and the gift card `CREATED`-status issue).
- The auto-email call in `webhooks.ts` is wrapped so a failure here can
  never undo a completed purchase — it's a best-effort delivery, not the
  source of truth for what the customer owns (that's always
  `LibraryEntry`/`Order.status`).

### Gift Card API

**Confirmed live, built and tested in `server/src/routes/giftcards.ts` and
`checkout.ts`, up to one real blocker described below.**

- **Endpoint:** `POST /giftcards` (merchant-scoped — `MERCHANT-ID` header,
  no path segment, same convention as Orders/Payments/Refunds).
- **Triggered by:** Admin issuing a new gift card.
- **Response fields stored:** `data.giftCardId` → `GiftCard.surfboardGiftCardId`;
  `data.pan` → `GiftCard.code` (Surfboard's own generated card number is
  used directly as the customer-facing redemption code, rather than
  generating a separate local one).
- **Amount units — confirmed live, contradicts the doc's own example:**
  Surfboard's Gift Card API doc shows `"amount": 100.00` as if it's a
  decimal. Following that literally created a card whose real balance,
  visible on its customer-facing shareable link, was **100x smaller** than
  intended (dividing our minor-units amount by 100 before sending meant the
  system then treated the result as minor units *again*). Fixed by sending
  the amount directly in minor units, matching every other money field in
  Surfboard's system — don't trust the decimal example in their docs.
- **Redemption (customer, at checkout):** v1 constraint — a gift card must
  fully cover the order total or it isn't applied at all; no partial-split
  between gift card and card payment yet. Implemented via `initiatePayment`
  with `paymentMethod: 'GIFTCARD'` right after `createOrder`, skipping the
  hosted Payment Page redirect entirely (no card entry needed when a gift
  card covers the whole order). Balance deduction is only *finalized* on
  webhook confirmation, not when the code is applied at checkout — avoids
  stranding balance on an abandoned checkout.
- **Known gap — cards can't actually be redeemed yet:** every gift card
  Surfboard creates starts in a `CREATED` status, and their Payments API
  refuses `GIFTCARD` payment against anything that isn't `ACTIVE`
  (`PS_0025: Gift card is not active. Current status: CREATED`). Checked
  for a path to `ACTIVE`: no activation endpoint among the 4 Gift Cards API
  routes, no action on the card's own customer-facing shareable link (its
  "How to Redeem" button just shows generic in-store instructions), and no
  control in the Partner Portal Console either. This is the same class of
  gap as Phase 3's missing test card — the integration code is correct and
  reaches Surfboard for real, but full end-to-end redemption can't be
  live-tested until this is resolved (possibly requires contacting
  Surfboard support, same as the missing test card).
  Re-checked against Surfboard's own "Gift Cards & Promotions" developer
  guide (2026-07-31): its example Create Gift Card response shows
  `"status": "ACTIVE"` immediately on creation — but every card created
  live in our sandbox comes back `"status": "CREATED"`. Doc vs. live
  mismatch, same pattern as other Surfboard docs issues in this project.
  Suggests activation isn't an API-reachable step at all (possibly a
  physical-terminal action, matching Surfboard's POS-centric product), not
  something we're missing in the request.

### Promotion API

**Confirmed live: there is no real Surfboard equivalent for this feature.**
Surfboard's actual Promotions API (`POST /merchants/:mId/stores/:sId/promotions`)
is a **marketing-banner display system** — title, image URL, background
color, button label, priority, and a `type` of `RECEIPT_BIG` / `RECEIPT_SMALL`
/ `IDLE_BIG_SPOT` / `OTHER_SCREEN`. No discount value, no customer-facing
code, no usage limit. It's also marked `comingSoon: true` in the doc — may
not even be live yet. This directly contradicts CLAUDE.md's original
assumption ("Store code, discount type/value, validity window, usage limit
locally"). **Decision (confirmed with the project owner):** promotions are
implemented as a **local-only feature** — `Promotion.surfboardPromotionId`
is nullable and stays `null`, no Surfboard call happens at all for this
feature. Everything else CLAUDE.md describes (discount codes, validity
window, usage limit) is real, tested, working business logic — just
entirely on our side.

- **Triggered by:** Admin creating a promotion (code, type `PERCENTAGE` or
  `FIXED_AMOUNT`, value, validity window, usage limit — all local).
- **Checkout-time validation:** re-validated at order-creation time in
  `checkout.ts`, not just when the code was first displayed — checks
  `startsAt`/`endsAt` against the current time, and counts existing
  `PromotionUsage` rows **where the linked `Order.status` is `PAID`**
  against `usageLimit` (a `PromotionUsage` row is created at checkout time,
  same pattern as gift card redemptions, but only counts toward the limit
  once the order actually completes — an abandoned checkout shouldn't burn
  a usage slot).
- **Confirmed live (`OR_0037: Invalid total order price`):** Surfboard's
  Create Order validates that `totalOrderAmount.total` reconciles with the
  order lines. A discounted total with no explanation for the difference
  is rejected outright — the discount has to be expressed via
  `totalOrderAmount.campaign`, with `regular - campaign = total`. Order
  lines themselves keep their undiscounted per-game price (matching
  `OrderItem.priceAtPurchase`'s historical-record purpose); the discount is
  represented once, at the order level.

---

## Merchant onboarding sequence (detailed)

**Prerequisite — billing plan:** Create Merchant fails with `"Partner has
none or more than one plan"` unless the partner account has exactly one
billing plan, or `controlFields.transactionPricingPlan` names one explicitly.
Confirmed live: our sandbox partner started with zero plans, so one had to
be created first via `POST /partners/{partnerId}/billing-plans` (see
`createBillingPlans` in `surfboard.ts`) before Create Merchant would succeed.
This isn't documented anywhere in CLAUDE.md — it's a real account-state
requirement discovered by actually running the call.

1. User submits "Register as Publisher" → server calls Merchant API
   `POST /partners/{partnerId}/merchants` with `controlFields.transactionPricingPlan`
   set to the partner's billing plan id.
2. Response returns `applicationId` and `webKybUrl`. Server creates a
   `Publisher` row with `surfboardApplicationId` set, `surfboardMerchantId`
   still null, `status = PENDING`. Client redirects the user to
   `webKybUrl` to complete Know-Your-Business verification with Surfboard.
3. Server polls `GET /partners/{partnerId}/merchants/{applicationId}/status`
   (interval **(proposed — confirm)**, not specified in CLAUDE.md — a
   webhook for the same transition may arrive first and should short-circuit
   the poll) until the status reaches `MERCHANT_CREATED`. Confirmed live:
   immediately after Create Merchant, status is `APPLICATION_INITIATED` —
   the KYB form at `webKybUrl` still has to actually be submitted before
   anything progresses further.
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

**Confirmed live, end-to-end, 2026-07-29:** created a real merchant
application (`applicationId: 844d37b4808f100710`), completed its KYB form
(skipping the bank-details step — see "Bank details are skippable" below),
and it reached `MERCHANT_CREATED` shortly after submission — no multi-day
wait. This matches Surfboard's own API reference: **"Merchant applications
in test and demo environments are configured for automatic approval."** So
the 3-4 business day review CLAUDE.md warns about is a production-KYB
number — in the sandbox, once the KYB form is actually submitted, it clears
fast. The resulting real `merchantId`/`storeId` from this run are now what
`SURFBOARD_DEMO_FALLBACK_MERCHANT_ID`/`STORE_ID` point to (see
[.env.example](../.env.example) and `server/.env`).

**Bank details are skippable.** Surfboard's own onboarding guide
(bundled in the `@surfboardpayments/surf-mcp` package,
`data/guides/in-store-payments/onboard-your-merchants/completing-your-kyb-url-application.md`)
states the Bank Information step (IBAN/BIC + a bank statement upload) can be
skipped — "bank details will be requested later via a separate link." This
is what let the demo fallback merchant get created without needing any real
banking details.

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

Fires on an `order.paymentcompleted` webhook. Steps 2-3 run inside one
`prisma.$transaction` in `server/src/routes/webhooks.ts` — **confirmed live**
end-to-end (real checkout → simulated signed webhook → verified all rows
below landed correctly, and that a resend was a no-op).

1. **Idempotency check** against `WebhookEvent.surfboardEventId` — if this
   event was already processed, no-op and return 200 immediately. ✅ built.
2. **Update status** — `Order.status` → `PAID`; a `Payment` row is created
   here (not earlier — Create Order doesn't return a `paymentId` up front
   for a PaymentPage terminal, only the webhook does). ✅ built.
3. **Create `LibraryEntry` rows** — one per `OrderItem` in the order. ✅ built.
4. **Finalize gift card deduction** — **not built yet** (Phase 4, no
   `GiftCard`/`GiftCardRedemption` write path exists yet).
5. **Increment `PromotionUsage`** — **not built yet** (Phase 4).
6. **Push status to the customer's UI** — the client's short-poll against
   `GET /checkout/:orderId/status` picks up the new `Order.status`; this
   endpoint reads the local DB only, it doesn't call Surfboard. ✅ built.
7. **Publisher revenue updates automatically** — no separate write needed;
   revenue is always derived from `Order`/`OrderItem` at read time. Still
   true, though the actual publisher revenue *page* isn't built yet.
8. **Mark `WebhookEvent.processedAt`** — commits the idempotency lock, in
   the same handler after the transaction succeeds. ✅ built.
