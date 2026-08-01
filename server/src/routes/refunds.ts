import { Router } from 'express';
import { OrderStatus, RefundStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { createOrder, SurfboardApiError } from '../services/surfboard';
import { asyncHandler } from '../lib/asyncHandler';

export const refundsRouter = Router();

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const TERMINAL_ID = process.env.SURFBOARD_DEMO_TERMINAL_ID as string;

const CURRENCY_NUMERIC_CODES: Record<string, string> = {
  SEK: '752',
  USD: '840',
  EUR: '978',
};

// Customer: request a refund on a completed order of their own.
refundsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { orderId, reason } = req.body ?? {};
    if (!orderId || !reason) {
      return res.status(400).json({ error: 'orderId and reason are required' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerId !== req.user!.id) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== OrderStatus.PAID) {
      return res.status(400).json({ error: 'Only a paid order can be refunded' });
    }

    const existing = await prisma.refund.findFirst({
      where: { orderId, status: { in: [RefundStatus.REQUESTED, RefundStatus.APPROVED, RefundStatus.COMPLETED] } },
    });
    if (existing) {
      return res.status(409).json({ error: 'A refund has already been requested for this order' });
    }

    const refund = await prisma.refund.create({
      data: { orderId, reason, amount: order.totalAmount, status: RefundStatus.REQUESTED },
    });
    res.status(201).json({ refund });
  })
);

// Admin/Publisher: list refund requests awaiting a decision. Publishers only
// see requests for orders containing their own games.
refundsRouter.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const where =
      req.user!.role === Role.PUBLISHER
        ? {
            status: RefundStatus.REQUESTED,
            order: { items: { some: { game: { publisher: { userId: req.user!.id } } } } },
          }
        : { status: RefundStatus.REQUESTED };

    const refunds = await prisma.refund.findMany({
      where,
      include: { order: { include: { items: { include: { game: true } }, customer: { select: { email: true } } } } },
    });
    res.json({ refunds });
  })
);

// Admin/Publisher: approve or reject a refund request.
refundsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const { action } = req.body ?? {};
    if (action !== 'APPROVE' && action !== 'REJECT') {
      return res.status(400).json({ error: 'action must be APPROVE or REJECT' });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { items: { include: { game: true } } } } },
    });
    if (!refund || refund.status !== RefundStatus.REQUESTED) {
      return res.status(404).json({ error: 'Refund request not found' });
    }

    if (req.user!.role === Role.PUBLISHER) {
      const publisher = await prisma.publisher.findUnique({ where: { userId: req.user!.id } });
      const ownsAllGames = refund.order.items.every((item) => item.game.publisherId === publisher?.id);
      if (!ownsAllGames) {
        return res.status(403).json({ error: 'You can only decide on refunds for your own games' });
      }
    }

    if (action === 'REJECT') {
      const updated = await prisma.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.REJECTED } });
      return res.json({ refund: updated });
    }

    // APPROVE: fire the real Surfboard refund order now — not before this
    // point, per CLAUDE.md ("Customer requests → Admin/Publisher approves
    // in-app → then call Surfboard").
    if (!refund.order.surfboardOrderId) {
      return res.status(400).json({ error: 'Original order has no Surfboard order ID on record' });
    }

    const numericCurrency = CURRENCY_NUMERIC_CODES[refund.order.currency];
    if (!numericCurrency) {
      return res.status(500).json({ error: `No numeric currency code mapped for ${refund.order.currency}` });
    }

    try {
      const refundOrder = await createOrder(refund.order.surfboardMerchantId ?? MERCHANT_ID, {
        'terminal$id': refund.order.surfboardTerminalId ?? TERMINAL_ID,
        referenceId: `refund-${refund.id}`,
        orderLines: refund.order.items.map((item) => ({
          id: item.gameId,
          name: item.game.title,
          quantity: -1,
          purchaseOrderId: refund.order.surfboardOrderId as string,
          amount: { regular: item.priceAtPurchase, total: -item.priceAtPurchase, currency: numericCurrency },
        })),
        totalOrderAmount: { regular: refund.amount, total: -refund.amount, currency: numericCurrency },
        controlFunctions: {
          initiatePaymentsOptions: { paymentMethod: 'CARD_NP' },
          callBackUrl: process.env.SURFBOARD_WEBHOOK_URL,
        },
      });

      const updated = await prisma.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.APPROVED, surfboardRefundId: refundOrder.data.orderId },
      });
      res.json({ refund: updated });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        console.error('Refund creation failed:', err.status, JSON.stringify(err.body));
        return res.status(502).json({ error: 'Could not create the refund with the payment provider', detail: err.body });
      }
      throw err;
    }
  })
);
