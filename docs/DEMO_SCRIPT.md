# Demo Script Runbook (5 minutes)

Source sequence and timings are from CLAUDE.md's Demo Script section —
build toward this, not beyond it. Screen names below (e.g. "Publisher
Sign Up", "Admin Approvals queue") are **(proposed — confirm)**: CLAUDE.md
describes the flow and role capabilities but doesn't name specific
routes/screens, so pick final names to match whatever the client app
actually ships with and update this doc to match.

**Before you start:** confirm `SURFBOARD_DEMO_FALLBACK_MERCHANT_ID` is set
and its merchant is actually KYB-approved in the Surfboard sandbox — the
whole demo after step 1 depends on it (see
[API_INTEGRATION.md](API_INTEGRATION.md#kyb-timing-constraint-and-the-demo-fallback)).
Also confirm the webhook tunnel (ngrok or equivalent) is live and
registered, and that seed data (admin, publisher, customer, a couple of
unpublished games) is loaded fresh.

---

## Phase 1 — Publisher registration (0:00–0:30)

**Screens:** Publisher Sign Up form → (redirect to Surfboard's `webKybUrl`,
narrate but don't necessarily complete it live) → Admin Approvals queue.

**Do:**
1. Log in as the demo publisher account (or sign up live if time allows).
2. Submit the "Register as Publisher" form.
3. Show the network/log evidence that a real `POST /partners/{partnerId}/merchants`
   call just fired (e.g. a terminal log line, or the returned
   `applicationId` displayed in the UI).
4. Switch to the admin account, open the Approvals queue, approve the
   publisher.

**Say:** "This isn't a mocked signup — that request just hit Surfboard's
sandbox Merchant API and got back a real `applicationId`. Real KYB review
takes 3-4 business days, so for the rest of this demo we'll operate under
a merchant we already pushed through KYB ahead of time — but this
registration step you just watched is 100% live."

**If it fails live:** Surfboard's API is unreachable, times out, or returns
an unexpected error.
- **Fallback:** have a terminal window pre-opened with a `curl`/Postman
  call to the same endpoint, run it there instead, and show the
  `applicationId` in the response JSON directly. Narrate the same point
  about it being a real API call. Move on — don't let this block phase 2.

---

## Phase 2 — Publisher uploads a game (0:30–1:00)

**Screens:** Publisher "Add Game" form → Storefront listing page.

**Do:**
1. As the (pre-approved, fallback-merchant-backed) publisher, fill in a
   game title/price/description and submit.
2. Navigate to the public storefront and show the game now listed.

**Say:** "The publisher's catalog lives entirely in our own Postgres —
Surfboard doesn't know or care about game metadata, only about the
merchant and the money."

**If it fails live:** game doesn't appear in the storefront (cache/list
query issue).
- **Fallback:** have this exact game pre-seeded already, and if the live
  create fails, simply refresh the storefront to show the seeded copy
  while explaining what should have just happened.

---

## Phase 3 — Customer checkout with promo + gift card (1:00–2:30)

**Screens:** Storefront → Game detail → Cart/Checkout page (promo + gift
card fields) → Surfboard-hosted Payment Page.

**Do:**
1. Log in as the demo customer.
2. Add the game to cart, go to checkout.
3. Enter a pre-seeded promo code — show the discount apply.
4. Enter a pre-seeded gift card code — show it fully cover the remainder
   (v1: gift card must cover the whole order or it's rejected, so pick
   amounts ahead of time that make this clean).
5. Click through to Surfboard's hosted Payment Page and complete payment
   with sandbox test card details.

**Say:** "Both the promo and the gift card are validated again right now,
server-side, at order-creation time — not just when they were first
displayed — so a code that expired or got used up in the last five minutes
would get rejected here even if it looked valid on the product page. The
actual card entry and payment happen on Surfboard's own hosted page, not
ours — we never touch card data."

**If it fails live:** promo/gift card validation rejects unexpectedly, or
the sandbox Payment Page itself errors.
- **Fallback:** have a second pre-validated promo/gift-card pair ready as a
  backup. If the Payment Page itself is down, fall back to narrating the
  flow over a screen recording captured during rehearsal, then resume the
  live demo at Phase 4 using an order that was completed minutes before
  the demo started.

---

## Phase 4 — Webhook-driven status update (2:30–3:30)

**Screens:** Checkout confirmation/order-status screen (left open,
polling).

**Do:**
1. Return from the Payment Page to the order confirmation screen.
2. Without refreshing, let the short-poll pick up the status change from
   `PENDING`/processing to completed as the `PAYMENT_COMPLETED` webhook
   lands server-side.
3. Optionally, switch to a terminal tailing server logs to show the
   webhook hit, signature verification, and the `WebhookEvent` idempotency
   check passing.

**Say:** "That status flip just now wasn't the browser guessing — Surfboard
sent us a signed webhook, we verified it, checked it against our
`WebhookEvent` table so a duplicate delivery wouldn't double-process it,
and only then updated the order. The library entry for this game just got
created as part of that same transaction."

**If it fails live:** webhook doesn't arrive within a reasonable window
(tunnel dropped, Surfboard-side delay).
- **Fallback:** have a manual "replay webhook" script/endpoint ready
  (pointed at the same sandbox payload shape) to fire the equivalent event
  locally, or fall back to a status-poll-only path calling the Payments API
  directly if the webhook infra is what's flaky, and be upfront that you're
  doing so: "the webhook's delayed, let's confirm via a direct status
  check instead."

---

## Phase 5 — Refund flow (3:30–4:30)

**Screens:** Customer order history → refund request form → Admin
payments/refunds queue → (back to) customer order status.

**Do:**
1. As the customer, open order history, request a refund on the order just
   completed, with a reason.
2. Switch to admin, open the refund queue, approve it.
3. Show the server-side Refund API call firing only now, after approval.
4. Show the refund's status update arriving via webhook, same idempotency
   path as payment completion.

**Say:** "The refund only reaches Surfboard after a human — admin or the
publisher — approves it in-app. The customer's request alone never calls
Surfboard directly."

**If it fails live:** Refund API call errors, or its confirmation webhook
is slow/missing.
- **Fallback:** same replay-webhook approach as Phase 4. If the Refund API
  itself is erroring, show the approval step completing locally (refund
  marked `APPROVED` in-app) and narrate that the Surfboard-side call would
  fire next, pointing at the code path rather than faking a success state.

---

## Phase 6 — Publisher revenue + admin analytics (4:30–5:00)

**Screens:** Publisher dashboard (sales/revenue) → Admin analytics
(sales chart, revenue-per-publisher table).

**Do:**
1. Switch back to the publisher account, show revenue reflecting the
   just-completed sale (and net of the refund, if timing allows).
2. Switch to admin, glance at the sales chart and revenue-per-publisher
   table.

**Say:** "None of this is a separate Surfboard call — it's all derived
straight from our own `Order`/`OrderItem` rows, computed at read time, so
it's always in sync with whatever actually happened in the flow you just
watched."

**If it fails live:** numbers look stale (revenue derived from
`Order`/`OrderItem` should update immediately, so a mismatch likely means a
transaction didn't commit, or the dashboard query is cached).
- **Fallback:** hard-refresh the page once; if still stale, acknowledge it
  plainly ("this figure should already reflect the sale — we'll follow up
  on why it hasn't") rather than trying to explain it away, and move to
  wrap-up.

---

## Rehearsal note

Per CLAUDE.md's Phase 5 build order: rehearse this end-to-end, twice,
before the real demo — both to catch timing drift against the 5-minute
budget and to have real (not hypothetical) fallback triggers to fill into
the "If it fails live" sections and into
[SETUP.md](SETUP.md#common-setup-errors) once actual failures are observed
during rehearsal.
