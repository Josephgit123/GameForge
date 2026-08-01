import { Router } from 'express';
import { GameStatus, GiftCardStatus, OrderStatus, PromotionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { createOrder, getOrderStatus, getReceiptLink, initiatePayment, SurfboardApiError } from '../services/surfboard';
import { asyncHandler } from '../lib/asyncHandler';
import { handlePaymentCompleted } from './webhooks';

export const checkoutRouter = Router();

// Surfboard wants the numeric ISO 4217 code, and it must match what the
// merchant's country/acquirer config actually supports — confirmed live,
// our demo merchant is Swedish and SEK-only. See docs/API_INTEGRATION.md
// "Orders API" for the OR_0004 error this guards against.
const CURRENCY_NUMERIC_CODES: Record<string, string> = {
  SEK: '752',
  USD: '840',
  EUR: '978',
};

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const TERMINAL_ID = process.env.SURFBOARD_DEMO_TERMINAL_ID as string;
const CLIENT_URL = process.env.CORS_ORIGIN as string;

// A publisher only has their own real merchant/terminal once Surfboard's
// application.merchantCreated webhook has fired for them (see webhooks.ts)
// and a terminal was successfully registered for their store. Until then —
// or if terminal registration failed — every sale falls back to the one
// shared demo merchant, same as before this existed.
async function resolveMerchantForPublisher(publisherId: string): Promise<{ merchantId: string; terminalId: string }> {
  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
    include: { stores: true },
  });
  const store = publisher?.stores.find((s) => s.surfboardTerminalId);
  if (publisher?.surfboardMerchantId && store?.surfboardTerminalId) {
    return { merchantId: publisher.surfboardMerchantId, terminalId: store.surfboardTerminalId };
  }
  return { merchantId: MERCHANT_ID, terminalId: TERMINAL_ID };
}

checkoutRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { gameIds, giftCardCode, promoCode } = req.body ?? {};
    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      return res.status(400).json({ error: 'gameIds must be a non-empty array' });
    }

    const games = await prisma.game.findMany({ where: { id: { in: gameIds }, status: GameStatus.PUBLISHED } });
    if (games.length !== gameIds.length) {
      return res.status(400).json({ error: 'One or more games are not available for purchase' });
    }

    const currency = games[0].currency;
    if (!games.every((g) => g.currency === currency)) {
      return res.status(400).json({ error: 'All games in an order must share the same currency' });
    }
    const numericCurrency = CURRENCY_NUMERIC_CODES[currency];
    if (!numericCurrency) {
      return res.status(500).json({ error: `No numeric currency code mapped for ${currency}` });
    }

    // v1 rule: one publisher per order. Real per-publisher Surfboard
    // merchants are single-merchant-scoped (Orders API can't split one
    // order's payment across two merchants), so a mixed-publisher cart
    // would have no single merchant to charge it under.
    const publisherId = games[0].publisherId;
    if (!games.every((g) => g.publisherId === publisherId)) {
      return res.status(400).json({ error: 'All games in an order must be from the same publisher' });
    }
    const { merchantId, terminalId } = await resolveMerchantForPublisher(publisherId);

    const rawTotal = games.reduce((sum, g) => sum + g.price, 0);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    // Re-validate the promo at order-creation time, not just when it was
    // displayed — a code can expire or hit its usage limit in between.
    let promotion = null;
    let discount = 0;
    if (promoCode) {
      const now = new Date();
      promotion = await prisma.promotion.findUnique({ where: { code: promoCode } });
      if (!promotion || promotion.startsAt > now || promotion.endsAt < now) {
        return res.status(400).json({ error: 'Promo code is not valid or has expired' });
      }
      // Only count usages tied to orders that actually completed — a
      // PromotionUsage row is created at checkout time (below) but
      // shouldn't count against the limit until the order is paid.
      const completedUsageCount = await prisma.promotionUsage.count({
        where: { promotionId: promotion.id, order: { status: OrderStatus.PAID } },
      });
      if (completedUsageCount >= promotion.usageLimit) {
        return res.status(400).json({ error: 'Promo code has reached its usage limit' });
      }
      discount =
        promotion.type === PromotionType.PERCENTAGE
          ? Math.round((rawTotal * promotion.value) / 100)
          : Math.min(promotion.value, rawTotal);
    }

    const totalAmount = rawTotal - discount;

    // v1 rule (CLAUDE.md): a gift card must fully cover the (already
    // discounted) order or it isn't applied at all — no partial-split.
    let giftCard = null;
    if (giftCardCode) {
      giftCard = await prisma.giftCard.findUnique({ where: { code: giftCardCode } });
      if (!giftCard || giftCard.status !== GiftCardStatus.ACTIVE) {
        return res.status(400).json({ error: 'Gift card code is not valid' });
      }
      if (giftCard.currentBalance < totalAmount) {
        return res.status(400).json({ error: 'Gift card balance does not fully cover this order' });
      }
    }

    const order = await prisma.order.create({
      data: {
        customerId: req.user!.id,
        status: OrderStatus.PENDING,
        totalAmount,
        currency,
        surfboardMerchantId: merchantId,
        surfboardTerminalId: terminalId,
        items: { create: games.map((g) => ({ gameId: g.id, priceAtPurchase: g.price })) },
      },
    });

    if (promotion) {
      await prisma.promotionUsage.create({
        data: { promotionId: promotion.id, orderId: order.id, discountApplied: discount },
      });
    }

    try {
      const surfboardOrder = await createOrder(merchantId, {
        'terminal$id': terminalId,
        referenceId: order.id,
        orderLines: games.map((g) => ({
          id: g.id,
          name: g.title,
          quantity: 1,
          amount: { regular: g.price, total: g.price, currency: numericCurrency },
        })),
        totalOrderAmount: { regular: rawTotal, total: totalAmount, campaign: discount, currency: numericCurrency },
        customer: user
          ? { person: { name: { firstName: user.firstName, lastName: user.lastName }, email: user.email } }
          : undefined,
        controlFunctions: {
          online: {
            redirectUrl: `${CLIENT_URL}/orders/${order.id}/confirmation`,
            failureRedirectUrl: `${CLIENT_URL}/orders/${order.id}/confirmation`,
          },
          callBackUrl: process.env.SURFBOARD_WEBHOOK_URL,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { surfboardOrderId: surfboardOrder.data.orderId },
      });

      if (giftCard) {
        // Fully covered by gift card — complete payment now via the Gift
        // Card payment method instead of redirecting to the hosted page.
        // Balance is deducted later, on webhook confirmation, not here
        // (see docs/API_INTEGRATION.md post-payment sequence step 4).
        await initiatePayment(merchantId, {
          orderId: surfboardOrder.data.orderId,
          paymentMethod: 'GIFTCARD',
          paymentMethodParams: { giftCardId: giftCard.surfboardGiftCardId },
        });
        await prisma.giftCardRedemption.create({
          data: { giftCardId: giftCard.id, orderId: order.id, amountApplied: totalAmount },
        });
        return res.status(201).json({ orderId: order.id, paymentPageLink: null });
      }

      res.status(201).json({
        orderId: order.id,
        paymentPageLink: surfboardOrder.data.paymentPageLink,
      });
    } catch (err) {
      // Local Order stays PENDING with no surfboardOrderId — customer can retry.
      if (err instanceof SurfboardApiError) {
        console.error('Checkout failed:', err.status, JSON.stringify(err.body));
        return res.status(502).json({ error: 'Could not create the order with the payment provider' });
      }
      throw err;
    }
  })
);

// Customer: own order history, with items and any refund on each order.
checkoutRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { game: true } }, refunds: true },
    });
    res.json({ orders });
  })
);

// Order status — this is what the frontend short-polls during checkout.
// Normally updated by the webhook, but the webhook needs a public URL
// (ngrok in local dev) that isn't always available. So if still PENDING
// locally, ask Surfboard directly instead of only waiting for a push —
// same completion logic (handlePaymentCompleted) either way, just
// triggered by a pull instead of a push.
checkoutRouter.get(
  '/:orderId/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order || order.customerId !== req.user!.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === OrderStatus.PENDING && order.surfboardOrderId) {
      try {
        const surfboardStatus = await getOrderStatus(order.surfboardMerchantId ?? MERCHANT_ID, order.surfboardOrderId);
        const completedPayment = surfboardStatus.data.payments.find((p) => p.paymentStatus === 'PAYMENT_COMPLETED');
        if (surfboardStatus.data.orderStatus === 'PAYMENT_COMPLETED' && completedPayment) {
          await handlePaymentCompleted({
            orderId: order.surfboardOrderId,
            paymentId: completedPayment.paymentId,
            paymentMethod: completedPayment.paymentMethod,
          });
        }
      } catch (err) {
        // Best-effort — if this check fails, fall back to whatever the
        // local status already is; a later poll (or the webhook, if it
        // does arrive) can still pick it up.
        console.error('Order status poll failed:', err instanceof SurfboardApiError ? err.body : err);
      }
    }

    const fresh = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    res.json({ status: fresh!.status });
  })
);

// Customer: a hosted link to their own receipt — real Surfboard-generated
// receipt, not something GameForge builds itself. Only meaningful once the
// order actually completed (see docs/API_INTEGRATION.md — Receipts API).
checkoutRouter.get(
  '/:orderId/receipt-link',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order || order.customerId !== req.user!.id) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== OrderStatus.PAID || !order.surfboardOrderId) {
      return res.status(400).json({ error: 'Only a paid order has a receipt' });
    }

    try {
      const receipt = await getReceiptLink(order.surfboardMerchantId ?? MERCHANT_ID, order.surfboardOrderId);
      res.json({ receiptUrl: receipt.data.receiptURL });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not fetch the receipt right now', detail: err.body });
      }
      throw err;
    }
  })
);
