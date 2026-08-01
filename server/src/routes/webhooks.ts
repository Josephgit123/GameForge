import { Router } from 'express';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyWebhookSignature } from '../lib/webhookSignature';
import { emailReceipt, registerOnlineTerminal, SurfboardApiError } from '../services/surfboard';

export const webhooksRouter = Router();

const WEBHOOK_SECRET = process.env.SURFBOARD_WEBHOOK_SECRET as string;
const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;

interface PaymentCompletedData {
  orderId: string;
  paymentId: string;
  paymentMethod: string;
}

interface MerchantCreatedData {
  applicationId: string;
  merchantId: string;
  storeId: string;
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
          surfboardReferenceId: data?.orderId ?? data?.applicationId ?? 'unknown',
          payload: req.body,
        },
      }));

    if (eventType === 'order.paymentcompleted') {
      await handlePaymentCompleted(data);
    } else if (eventType === 'application.merchantCreated') {
      await handleMerchantCreated(data);
    }
    // Other event types (order.paymentfailed, order.paymentcancelled, the
    // earlier merchant-application stages, etc.) aren't handled yet —
    // acknowledged but not acted on.

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
    include: { items: true, customer: { select: { email: true } } },
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

// Fires once a publisher's real Surfboard merchant is created (KYB
// approved). Captures merchantId/storeId onto the Publisher/Store rows,
// then registers an online terminal for that store — an order can't be
// created against a store with no terminal, same requirement the shared
// demo merchant needed (see services/surfboard.ts#registerOnlineTerminal).
// checkout.ts reads Store.surfboardTerminalId to route that publisher's own
// sales through their own merchant instead of the shared fallback.
export async function handleMerchantCreated(data: MerchantCreatedData) {
  const publisher = await prisma.publisher.findFirst({ where: { surfboardApplicationId: data.applicationId } });
  if (!publisher) {
    console.warn(`webhook: no local Publisher for applicationId ${data.applicationId}`);
    return;
  }
  if (publisher.surfboardMerchantId) {
    return; // already processed — same belt-and-suspenders pattern as handleOriginalOrderCompleted
  }

  await prisma.publisher.update({
    where: { id: publisher.id },
    data: { surfboardMerchantId: data.merchantId },
  });

  const store = await prisma.store.create({
    data: { publisherId: publisher.id, surfboardStoreId: data.storeId },
  });

  // Best-effort — if terminal registration fails, the publisher still has a
  // real merchantId on file; checkout.ts falls back to the shared demo
  // merchant/terminal until a terminal exists for this store.
  try {
    const terminal = await registerOnlineTerminal(data.merchantId, data.storeId);
    await prisma.store.update({ where: { id: store.id }, data: { surfboardTerminalId: terminal.data.terminalId } });
  } catch (err) {
    if (err instanceof SurfboardApiError) {
      console.error('Register online terminal failed:', err.status, JSON.stringify(err.body));
    } else {
      console.error('Register online terminal failed:', err);
    }
  }
}

async function handleOriginalOrderCompleted(
  order: {
    id: string;
    status: OrderStatus;
    customerId: string;
    items: { gameId: string }[];
    customer: { email: string };
    surfboardMerchantId: string | null;
  },
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

  // Best-effort — a failed receipt email must never undo a completed
  // purchase. The customer can still see everything in Order History either
  // way; this is a convenience delivery, not the source of truth.
  try {
    await emailReceipt(order.surfboardMerchantId ?? MERCHANT_ID, data.orderId, order.customer.email);
  } catch (err) {
    if (err instanceof SurfboardApiError) {
      console.error('Email receipt failed:', err.status, JSON.stringify(err.body));
    } else {
      console.error('Email receipt failed:', err);
    }
  }
}
