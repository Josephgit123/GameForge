import { Router } from 'express';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyWebhookSignature } from '../lib/webhookSignature';

export const webhooksRouter = Router();

const WEBHOOK_SECRET = process.env.SURFBOARD_WEBHOOK_SECRET as string;

interface PaymentCompletedData {
  orderId: string;
  paymentId: string;
  paymentMethod: string;
}

webhooksRouter.post('/surfboard', async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const { eventType, metadata, data } = req.body ?? {};
  const surfboardEventId: string | undefined = metadata?.eventId;
  if (!surfboardEventId) {
    return res.status(400).json({ error: 'Missing metadata.eventId' });
  }

  try {
    const existing = await prisma.webhookEvent.findUnique({ where: { surfboardEventId } });
    if (existing?.processedAt) {
      return res.status(200).json({ status: 'already processed' });
    }

    const webhookEvent =
      existing ??
      (await prisma.webhookEvent.create({
        data: {
          surfboardEventId,
          eventType: eventType ?? 'unknown',
          surfboardReferenceId: data?.orderId ?? 'unknown',
          payload: req.body,
        },
      }));

    if (eventType === 'order.paymentcompleted') {
      await handlePaymentCompleted(data);
    }
    // Other event types (order.paymentfailed, order.paymentcancelled, etc.)
    // aren't handled yet — acknowledged but not acted on.

    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date() } });
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('webhook processing error', err);
    // 500 so Surfboard retries — safe, since the idempotency check above
    // means a retry is a no-op if this actually did complete.
    res.status(500).json({ error: 'Internal error processing webhook' });
  }
});

export async function handlePaymentCompleted(data: PaymentCompletedData) {
  const order = await prisma.order.findFirst({
    where: { surfboardOrderId: data.orderId },
    include: { items: true },
  });
  if (order) {
    await handleOriginalOrderCompleted(order, data);
    return;
  }

  // Not an original purchase order — check whether it's a refund order
  // (refunds are created as a separate Surfboard order, see
  // docs/API_INTEGRATION.md#refund-api).
  const refund = await prisma.refund.findFirst({ where: { surfboardRefundId: data.orderId } });
  if (refund) {
    await prisma.$transaction(async (tx) => {
      await tx.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.COMPLETED } });
      await tx.order.update({ where: { id: refund.orderId }, data: { status: OrderStatus.REFUNDED } });
    });
    return;
  }

  console.warn(`webhook: no local Order or Refund for surfboardOrderId ${data.orderId}`);
}

async function handleOriginalOrderCompleted(
  order: { id: string; status: OrderStatus; customerId: string; items: { gameId: string }[] },
  data: PaymentCompletedData
) {
  // Belt-and-suspenders alongside the WebhookEvent id dedup above — this
  // guards against reprocessing the same order via two different event ids
  // (e.g. a manual reconciliation followed by a late real webhook retry).
  if (order.status === OrderStatus.PAID) {
    return;
  }

  const giftCardRedemption = await prisma.giftCardRedemption.findUnique({ where: { orderId: order.id } });

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } });
    await tx.payment.create({
      data: {
        orderId: order.id,
        surfboardPaymentId: data.paymentId,
        status: PaymentStatus.COMPLETED,
        method: data.paymentMethod,
      },
    });
    for (const item of order.items) {
      await tx.libraryEntry.create({
        data: { customerId: order.customerId, gameId: item.gameId, orderId: order.id },
      });
    }
    // Finalize gift card deduction now, not when it was applied at
    // checkout — an abandoned checkout shouldn't strand the balance.
    if (giftCardRedemption) {
      await tx.giftCard.update({
        where: { id: giftCardRedemption.giftCardId },
        data: { currentBalance: { decrement: giftCardRedemption.amountApplied } },
      });
    }
    // PromotionUsage increment isn't implemented yet — that's the next
    // piece of Phase 4.
  });
}
