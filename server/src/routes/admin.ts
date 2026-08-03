import { Router } from 'express';
import { PublisherStatus, Role, SubscriptionStatus, SubscriptionChargeStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { createOrder, getOrderStatus, globalSearch, initiatePayment, SurfboardApiError } from '../services/surfboard';
import { CURRENCY_NUMERIC_CODES } from './subscriptions';

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const SUBSCRIPTION_TERMINAL_ID = process.env.SURFBOARD_SUBSCRIPTION_TERMINAL_ID as string;
const SUBSCRIPTION_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Admin-only, cross-cutting endpoints that don't belong to any single
// resource router: user/publisher management, an all-games view spanning
// every publisher, and a raw transaction ledger. Real Prisma-backed reads
// and writes throughout — no mock data.
export const adminRouter = Router();

// --- Manage Users ---

adminRouter.get(
  '/users',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { email: 'asc' },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        publisher: {
          select: { id: true, status: true, surfboardMerchantId: true, surfboardApplicationId: true, webKybUrl: true },
        },
      },
    });
    res.json({ users });
  })
);

// Approve or reject a publisher's onboarding application. This is the
// missing half of Publisher.status — nothing previously transitioned a
// publisher out of PENDING except a seed script.
adminRouter.patch(
  '/publishers/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { action } = req.body ?? {};
    if (action !== 'APPROVE' && action !== 'REJECT') {
      return res.status(400).json({ error: 'action must be APPROVE or REJECT' });
    }

    const publisher = await prisma.publisher.findUnique({ where: { id: req.params.id } });
    if (!publisher) {
      return res.status(404).json({ error: 'Publisher not found' });
    }
    if (publisher.status !== PublisherStatus.PENDING) {
      return res.status(400).json({ error: `Publisher is already ${publisher.status}` });
    }

    const updated = await prisma.publisher.update({
      where: { id: publisher.id },
      data: { status: action === 'APPROVE' ? PublisherStatus.APPROVED : PublisherStatus.REJECTED },
    });
    res.json({ publisher: updated });
  })
);

// --- Manage Games (every publisher, every status) ---

adminRouter.get(
  '/games',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const games = await prisma.game.findMany({
      orderBy: { createdAt: 'desc' },
      include: { publisher: { include: { user: true } } },
    });
    res.json({
      games: games.map(({ publisher, ...game }) => ({
        ...game,
        publisherName: `${publisher.user.firstName} ${publisher.user.lastName}`,
      })),
    });
  })
);
// Editing/delisting a game reuses the existing PATCH /games/:id, which
// already allows ADMIN to set any GameStatus (see routes/games.ts) — no
// duplicate write path needed here.

// --- Monitor Transactions ---

adminRouter.get(
  '/transactions',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { email: true } },
        items: { include: { game: { select: { title: true } } } },
        refunds: true,
      },
    });
    res.json({ orders });
  })
);

// --- Global Search ---
// Partner-wide, across every merchant on the account — admin-only, never
// exposed to a publisher (see surfboard.ts#globalSearch for why: no
// MERCHANT-ID scoping on this endpoint at all).
const SEARCH_STRING_PARAMS = [
  'merchantId',
  'merchantType',
  'storeId',
  'storeStatus',
  'terminalStatus',
  'applicationStatus',
  'applicationType',
  'type',
] as const;

adminRouter.get(
  '/search',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { query, pageNumber } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required' });
    }

    const filters: Record<string, string> = {};
    for (const key of SEARCH_STRING_PARAMS) {
      const value = req.query[key];
      if (typeof value === 'string') filters[key] = value;
    }

    try {
      const result = await globalSearch({
        query,
        pageNumber: typeof pageNumber === 'string' ? Number(pageNumber) : undefined,
        ...filters,
      });
      res.json({ data: result.data });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not search right now', detail: err.body });
      }
      throw err;
    }
  })
);

// --- GameForge+ subscriptions ---

adminRouter.get(
  '/subscriptions',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { email: true } }, charges: { orderBy: { createdAt: 'desc' } } },
    });
    res.json({ subscriptions });
  })
);

// Renewal charges have no background job/cron in this project (CLAUDE.md
// keeps the stack boring) — an admin triggers this on demand, and it
// charges every subscription whose currentPeriodEnd has already passed.
// Real createOrder + initiatePayment(CTOKEN) calls per subscription, same
// wrapper every other Surfboard call goes through.
adminRouter.post(
  '/subscriptions/process-renewals',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const due = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: { lte: new Date() } },
    });

    const results = [];
    for (const subscription of due) {
      results.push({ subscriptionId: subscription.id, succeeded: await chargeRenewal(subscription) });
    }

    res.json({
      processed: results.length,
      succeeded: results.filter((r) => r.succeeded).length,
      results,
    });
  })
);

async function chargeRenewal(subscription: {
  id: string;
  amount: number;
  currency: string;
  surfboardTokenId: string | null;
  currentPeriodEnd: Date | null;
}): Promise<boolean> {
  if (!subscription.surfboardTokenId) {
    await prisma.subscriptionCharge.create({
      data: { subscriptionId: subscription.id, status: SubscriptionChargeStatus.FAILED, amount: subscription.amount, currency: subscription.currency },
    });
    await prisma.subscription.update({ where: { id: subscription.id }, data: { status: SubscriptionStatus.PAST_DUE } });
    return false;
  }

  const numericCurrency = CURRENCY_NUMERIC_CODES[subscription.currency] ?? '752';
  let surfboardOrderId: string | undefined;
  let completed = false;

  try {
    const order = await createOrder(MERCHANT_ID, {
      'terminal$id': SUBSCRIPTION_TERMINAL_ID,
      referenceId: `sub-renewal-${subscription.id}-${(subscription.currentPeriodEnd ?? new Date()).getTime()}`,
      orderLines: [
        {
          id: 'gameforge-plus',
          name: 'GameForge+ subscription renewal',
          quantity: 1,
          amount: { regular: subscription.amount, total: subscription.amount, currency: numericCurrency },
        },
      ],
      totalOrderAmount: { regular: subscription.amount, total: subscription.amount, currency: numericCurrency },
    });
    surfboardOrderId = order.data.orderId;

    await initiatePayment(MERCHANT_ID, {
      orderId: surfboardOrderId,
      paymentMethod: 'CTOKEN',
      paymentMethodParams: { tokenId: subscription.surfboardTokenId },
    });

    // No webhook wired for renewal orders (they don't set callBackUrl) —
    // this is a synchronous admin action, so poll directly instead.
    for (let attempt = 0; attempt < 3 && !completed; attempt++) {
      await sleep(1000);
      const status = await getOrderStatus(MERCHANT_ID, surfboardOrderId);
      completed = status.data.orderStatus === 'PAYMENT_COMPLETED';
    }
  } catch (err) {
    console.error('Subscription renewal charge failed:', err instanceof SurfboardApiError ? err.body : err);
  }

  await prisma.subscriptionCharge.create({
    data: {
      subscriptionId: subscription.id,
      surfboardOrderId,
      status: completed ? SubscriptionChargeStatus.PAID : SubscriptionChargeStatus.FAILED,
      amount: subscription.amount,
      currency: subscription.currency,
    },
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: completed
      ? { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: new Date((subscription.currentPeriodEnd ?? new Date()).getTime() + SUBSCRIPTION_INTERVAL_MS) }
      : { status: SubscriptionStatus.PAST_DUE },
  });

  return completed;
}
