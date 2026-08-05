import { Router } from 'express';
import { SubscriptionStatus, SubscriptionChargeStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { createOrder, getOrderStatus, getOrderTokens, SurfboardApiError } from '../services/surfboard';
import { asyncHandler } from '../lib/asyncHandler';

// GameForge+ — one platform-level plan, no admin-configurable pricing in v1
// (CLAUDE.md's 2-3 day scope). Real money-shaped constants: minor units.
export const SUBSCRIPTION_AMOUNT = 4900; // 49.00 SEK
export const SUBSCRIPTION_CURRENCY = 'SEK';
export const SUBSCRIPTION_DISCOUNT_PERCENT = 10;
const SUBSCRIPTION_INTERVAL_DAYS = 30;

export const CURRENCY_NUMERIC_CODES: Record<string, string> = { SEK: '752', USD: '840', EUR: '978' };

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const TERMINAL_ID = process.env.SURFBOARD_DEMO_TERMINAL_ID as string;
const CLIENT_URL = process.env.CORS_ORIGIN as string;

export const subscriptionsRouter = Router();

subscriptionsRouter.post(
  '/start',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.subscription.findUnique({ where: { customerId: req.user!.id } });
    if (
      existing &&
      existing.status !== SubscriptionStatus.PENDING_ACTIVATION &&
      existing.status !== SubscriptionStatus.CANCELLED
    ) {
      return res.status(400).json({ error: `You already have a subscription (${existing.status})` });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const numericCurrency = CURRENCY_NUMERIC_CODES[SUBSCRIPTION_CURRENCY];

    // Reset in place rather than delete+recreate — customerId is unique
    // (one row per customer ever, per the schema comment), and a CANCELLED
    // subscription may already have real SubscriptionCharge history that a
    // delete would orphan/violate the FK on. Covers both a stale
    // PENDING_ACTIVATION retry and a genuine CANCELLED resubscribe.
    const subscription = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: SubscriptionStatus.PENDING_ACTIVATION,
            amount: SUBSCRIPTION_AMOUNT,
            currency: SUBSCRIPTION_CURRENCY,
            discountPercent: SUBSCRIPTION_DISCOUNT_PERCENT,
            surfboardTokenId: null,
            cardBrand: null,
            truncatedPan: null,
            pendingOrderId: null,
            currentPeriodEnd: null,
            cancelledAt: null,
          },
        })
      : await prisma.subscription.create({
          data: {
            customerId: req.user!.id,
            amount: SUBSCRIPTION_AMOUNT,
            currency: SUBSCRIPTION_CURRENCY,
            discountPercent: SUBSCRIPTION_DISCOUNT_PERCENT,
          },
        });

    try {
      // Signup charge goes through the normal PaymentPage terminal, same as
      // any other checkout — enforceTokenization is what makes this one
      // different, saving the card as a reusable token for renewals.
      const surfboardOrder = await createOrder(MERCHANT_ID, {
        'terminal$id': TERMINAL_ID,
        referenceId: `sub-signup-${subscription.id}`,
        orderLines: [
          {
            id: 'gameforge-plus',
            name: 'GameForge+ subscription',
            quantity: 1,
            amount: { regular: SUBSCRIPTION_AMOUNT, total: SUBSCRIPTION_AMOUNT, currency: numericCurrency },
          },
        ],
        totalOrderAmount: { regular: SUBSCRIPTION_AMOUNT, total: SUBSCRIPTION_AMOUNT, currency: numericCurrency },
        customer: user
          ? { person: { name: { firstName: user.firstName, lastName: user.lastName }, email: user.email } }
          : undefined,
        controlFunctions: {
          online: {
            redirectUrl: `${CLIENT_URL}/subscription/confirmation`,
            failureRedirectUrl: `${CLIENT_URL}/subscription/confirmation`,
          },
          callBackUrl: process.env.SURFBOARD_WEBHOOK_URL,
          enforceTokenization: true,
        },
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { pendingOrderId: surfboardOrder.data.orderId },
      });

      res.status(201).json({ paymentPageLink: surfboardOrder.data.paymentPageLink });
    } catch (err) {
      // Delete only if this row is brand new (never had a chance to accrue
      // charge history yet). If it already existed (a PENDING_ACTIVATION
      // retry or a CANCELLED resubscribe), restore its prior status instead
      // of deleting — same FK/history reasoning as above.
      if (existing) {
        await prisma.subscription.update({ where: { id: subscription.id }, data: { status: existing.status } });
      } else {
        await prisma.subscription.delete({ where: { id: subscription.id } });
      }
      if (err instanceof SurfboardApiError) {
        console.error('Subscription signup failed:', err.status, JSON.stringify(err.body));
        return res.status(502).json({ error: 'Could not start the subscription with the payment provider' });
      }
      throw err;
    }
  })
);

// Customer: current subscription (any status), with the same poll-fallback
// reconciliation pattern as checkout's order status route — the signup
// charge's webhook needs a public URL (ngrok) that isn't always available,
// so ask Surfboard directly if still PENDING_ACTIVATION locally.
subscriptionsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findUnique({ where: { customerId: req.user!.id } });
    if (!subscription) {
      return res.json({ subscription: null });
    }

    if (subscription.status === SubscriptionStatus.PENDING_ACTIVATION && subscription.pendingOrderId) {
      try {
        const surfboardStatus = await getOrderStatus(MERCHANT_ID, subscription.pendingOrderId);
        const completedPayment = surfboardStatus.data.payments.find((p) => p.paymentStatus === 'PAYMENT_COMPLETED');
        if (surfboardStatus.data.orderStatus === 'PAYMENT_COMPLETED' && completedPayment) {
          await activateSubscription(subscription.pendingOrderId);
        }
      } catch (err) {
        console.error('Subscription status poll failed:', err instanceof SurfboardApiError ? err.body : err);
      }
    }

    const fresh = await prisma.subscription.findUnique({ where: { customerId: req.user!.id } });
    res.json({ subscription: fresh });
  })
);

subscriptionsRouter.post(
  '/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findUnique({ where: { customerId: req.user!.id } });
    if (!subscription || (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.PAST_DUE)) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
    res.json({ subscription: updated });
  })
);

// Shared by the poll route above and the real webhook path in webhooks.ts —
// same dual-path (pull or push) reconciliation as handlePaymentCompleted.
// A no-op if surfboardOrderId isn't a subscription signup order at all, or
// if it's already been activated (belt-and-suspenders, same pattern as
// handleOriginalOrderCompleted's OrderStatus.PAID check).
export async function activateSubscription(surfboardOrderId: string) {
  const subscription = await prisma.subscription.findFirst({ where: { pendingOrderId: surfboardOrderId } });
  if (!subscription || subscription.status !== SubscriptionStatus.PENDING_ACTIVATION) {
    return;
  }

  const tokens = await getOrderTokens(MERCHANT_ID, surfboardOrderId);
  const token = tokens.data[0];
  if (!token) {
    console.error(`Subscription activation: no token returned for order ${surfboardOrderId}`);
    return;
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        surfboardTokenId: token.tokenId,
        cardBrand: token.cardBrand,
        truncatedPan: token.truncatedPan,
        currentPeriodEnd: new Date(now.getTime() + SUBSCRIPTION_INTERVAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    await tx.subscriptionCharge.create({
      data: {
        subscriptionId: subscription.id,
        surfboardOrderId,
        status: SubscriptionChargeStatus.PAID,
        amount: subscription.amount,
        currency: subscription.currency,
      },
    });
  });
}
