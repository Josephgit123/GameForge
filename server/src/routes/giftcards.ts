import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { createGiftCard, SurfboardApiError } from '../services/surfboard';
import { asyncHandler } from '../lib/asyncHandler';

export const giftCardsRouter = Router();

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;

// Admin: issue a new gift card. Amount is in minor units, matching every
// other money field in this codebase and the Surfboard API AS ACTUALLY
// OBSERVED — confirmed live via the gift card's customer-facing shareable
// link, which rendered a balance 100x smaller than intended when we passed
// a decimal amount per the doc's example ("amount": 100.00). Their docs'
// example is misleading; minor units is what the real system expects.
giftCardsRouter.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { amount, currency, name } = req.body ?? {};
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0 || !currency) {
      return res.status(400).json({ error: 'amount (integer, minor units) and currency are required' });
    }

    try {
      const surfboardGiftCard = await createGiftCard(MERCHANT_ID, {
        cardType: 'FUND',
        amount,
        currency,
        name,
        accessControl: 'OPEN',
      });

      const giftCard = await prisma.giftCard.create({
        data: {
          surfboardGiftCardId: surfboardGiftCard.data.giftCardId,
          code: surfboardGiftCard.data.pan,
          initialBalance: amount,
          currentBalance: amount,
        },
      });
      res.status(201).json({ giftCard });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not create the gift card with the payment provider', detail: err.body });
      }
      throw err;
    }
  })
);

// Admin: list issued gift cards.
giftCardsRouter.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const giftCards = await prisma.giftCard.findMany({ orderBy: { id: 'desc' } });
    res.json({ giftCards });
  })
);
