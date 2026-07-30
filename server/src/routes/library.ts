import { Router } from 'express';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

export const libraryRouter = Router();

// Customer: games they own, one row per completed purchase. A refunded
// order's games drop out — refunding removes ownership, not just money.
libraryRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const entries = await prisma.libraryEntry.findMany({
      where: { customerId: req.user!.id, order: { status: { not: OrderStatus.REFUNDED } } },
      include: { game: true },
      orderBy: { acquiredAt: 'desc' },
    });
    res.json({ entries });
  })
);
