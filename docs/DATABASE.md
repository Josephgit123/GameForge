# Database Schema

Postgres via Prisma. This is the full model list from [CLAUDE.md](../CLAUDE.md).

> **Note on types below:** CLAUDE.md lists field names per model but not every
> Prisma type, enum value set, or relationship cardinality. Where a type or
> cardinality is a direct, unambiguous consequence of CLAUDE.md's text (e.g.
> money fields are integers per the Conventions section), it's stated as fact.
> Where CLAUDE.md is silent and a decision was needed to write a usable schema
> (enum value sets, id type, relationship cardinality), it's marked
> **(proposed — confirm)**. See the ambiguity list at the end of this repo's
> doc generation pass for the full rundown.

All `id` fields below are proposed as `String @id @default(uuid())`
**(proposed — confirm)** — CLAUDE.md doesn't specify id type.

---

## User

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| email | String | unique |
| passwordHash | String | bcrypt/argon2 hash, never the raw password |
| role | enum `Role` (`CUSTOMER`, `PUBLISHER`, `ADMIN`) | drives `requireRole` middleware |
| firstName | String | |
| lastName | String | |

**Relationships:** one `User` → one `Publisher` (optional, only if they've
registered as a publisher) · one `User` → many `Order` (as customer) · one
`User` → many `LibraryEntry` (as customer).

---

## Publisher

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| userId | String | FK → `User.id`, unique (one publisher profile per user) |
| surfboardMerchantId | String, nullable | set once Surfboard onboarding reaches `MERCHANT_CREATED` — see [API_INTEGRATION.md](API_INTEGRATION.md) |
| surfboardApplicationId | String, nullable | set immediately on Create Merchant call, before `merchantId` exists |
| status | enum `PublisherStatus` (`PENDING`, `APPROVED`, `REJECTED`) | local approval state — distinct from Surfboard's own KYB status |

**Why store both `surfboardApplicationId` and `surfboardMerchantId`:** the
Merchant API returns `applicationId` immediately but `merchantId` only after
KYB clears (`MERCHANT_CREATED`). Both are needed to poll status and to later
address merchant-scoped endpoints (Orders, Payments).

**Relationships:** one `Publisher` → many `Store` · one `Publisher` → many
`Game`.

---

## Store

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| publisherId | String | FK → `Publisher.id` |
| surfboardStoreId | String | returned by Surfboard, either from the default store created during onboarding or from a subsequent Store API call |

---

## Game

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| publisherId | String | FK → `Publisher.id` |
| title | String | |
| description | String | |
| price | Int | minor units (e.g. cents/öre) per Conventions in CLAUDE.md |
| currency | String | ISO 4217 code (e.g. `USD`), **(proposed — confirm)** target currency isn't stated in CLAUDE.md |
| status | enum `GameStatus`, **(proposed — confirm)** e.g. `DRAFT`, `PUBLISHED`, `DELISTED` — exact values not specified |

**Relationships:** one `Game` → many `OrderItem` · one `Game` → many
`LibraryEntry`.

---

## Order

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| customerId | String | FK → `User.id` |
| surfboardOrderId | String, nullable | set after the Orders API create call succeeds |
| status | enum `OrderStatus`, **(proposed — confirm)** e.g. `PENDING`, `PAID`, `FAILED`, `REFUNDED` — exact values not specified in CLAUDE.md; should track Surfboard's own order/payment status vocabulary once confirmed |
| totalAmount | Int | minor units, computed after promo/gift-card discounts are applied, before the Orders API call |
| currency | String | ISO 4217 code |
| createdAt | DateTime | |

**Relationships:** one `Order` → many `OrderItem` · one `Order` → many
`Payment` **(proposed — confirm)** (modeled as one-to-many to allow a failed
attempt followed by a retry; CLAUDE.md doesn't state whether an order can have
more than one payment record) · one `Order` → many `Refund` · one `Order` →
many `LibraryEntry` · one `Order` → zero-or-one `GiftCardRedemption` (v1: at
most one gift card per order, per the "must fully cover order" rule) ·
one `Order` → zero-or-one `PromotionUsage`.

---

## OrderItem

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| orderId | String | FK → `Order.id` |
| gameId | String | FK → `Game.id` |
| priceAtPurchase | Int | minor units — snapshot of `Game.price` at purchase time, so later price changes don't rewrite history |

---

## Payment

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| orderId | String | FK → `Order.id` |
| surfboardPaymentId | String | returned by Surfboard's Payments API |
| status | enum `PaymentStatus`, **(proposed — confirm)** e.g. `PENDING`, `COMPLETED`, `FAILED` — should mirror Surfboard's payment status values once confirmed |
| method | String | payment method as reported by Surfboard (card, wallet, etc.) — not a fixed local enum since Surfboard determines available methods |

---

## Refund

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| orderId | String | FK → `Order.id` |
| surfboardRefundId | String, nullable | set once the Refund API call succeeds — see approval flow in [API_INTEGRATION.md](API_INTEGRATION.md) |
| status | enum `RefundStatus`, **(proposed — confirm)** e.g. `REQUESTED`, `APPROVED`, `COMPLETED`, `REJECTED` — exact values not specified |
| reason | String | customer-provided |
| amount | Int | minor units |

---

## LibraryEntry

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| customerId | String | FK → `User.id` |
| gameId | String | FK → `Game.id` |
| orderId | String | FK → `Order.id` — the order that granted access |
| acquiredAt | DateTime | |

Created per game line item once a `PAYMENT_COMPLETED` webhook is processed
(step 3 of the [post-payment-success sequence](API_INTEGRATION.md)).

---

## GiftCard

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| surfboardGiftCardId | String | returned by the Gift Card API when admin issues the card |
| code | String | unique, customer-facing redemption code — generation scheme **(proposed — confirm)**, not specified in CLAUDE.md |
| initialBalance | Int | minor units |
| currentBalance | Int | minor units, decremented on redemption |
| status | enum `GiftCardStatus`, **(proposed — confirm)** e.g. `ACTIVE`, `DEPLETED`, `EXPIRED` — exact values not specified |

**Relationships:** one `GiftCard` → many `GiftCardRedemption`.

---

## GiftCardRedemption

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| giftCardId | String | FK → `GiftCard.id` |
| orderId | String | FK → `Order.id` |
| amountApplied | Int | minor units — in v1 this always equals the order total, since partial coverage isn't supported yet |

---

## Promotion

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| surfboardPromotionId | String | returned by the Promotion API when admin creates it |
| code | String | unique, customer-facing |
| type | enum `PromotionType`, **(proposed — confirm)** e.g. `PERCENTAGE`, `FIXED_AMOUNT` — exact values not specified in CLAUDE.md |
| value | Int | percentage points or minor units, depending on `type` |
| startsAt | DateTime | |
| endsAt | DateTime | |
| usageLimit | Int | total redemptions allowed across all customers |

**Relationships:** one `Promotion` → many `PromotionUsage`.

---

## PromotionUsage

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| promotionId | String | FK → `Promotion.id` |
| orderId | String | FK → `Order.id` |
| discountApplied | Int | minor units, actual amount discounted on that order |

Row is only inserted after successful payment (step 5 of the
[post-payment-success sequence](API_INTEGRATION.md)) — validation at checkout
time (active/unexpired/under-limit) counts *existing* rows against
`usageLimit`, it doesn't write one.

---

## WebhookEvent

| Column | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| eventType | String | e.g. `PAYMENT_COMPLETED`, `MERCHANT_CREATED`, `REFUND_COMPLETED` |
| surfboardReferenceId | String | the Surfboard-side entity ID the event refers to (order/payment/refund/merchant ID depending on `eventType`) |
| payload | Json | raw webhook body, kept for auditing/replay |
| processedAt | DateTime, nullable | set once the handler has fully applied the event's state changes |

### Idempotency pattern

Surfboard may deliver the same webhook more than once (retries on timeout,
at-least-once delivery). Every webhook handler must, before touching any
other table:

1. Look up an existing `WebhookEvent` row by `surfboardEventId`.
   **Confirmed live** against Surfboard's actual webhook payload
   (`metadata.eventId`) — a genuine globally-unique event ID, distinct from
   the entity ID (`data.orderId`, etc.) the event refers to. This replaced
   an earlier composite-key guess once the real payload shape was confirmed.
   Surfboard's own docs recommend exactly this: dedupe on `metadata.eventId`.
2. If a row exists **and** `processedAt` is set, no-op — return 200 and stop.
3. If no row exists, insert one (with `processedAt` still null) inside the
   same transaction as the rest of the handler's state changes, then set
   `processedAt` on success.
4. Verify the webhook signature *before* step 1 — an unverified payload
   should never reach the idempotency check or the database.

This makes the row double as both an audit log and a dedupe lock — a crash
between insert and `processedAt` update is safer to re-run than to skip,
since downstream writes (steps 2-5 of the post-payment sequence) are each
individually safe to retry.
