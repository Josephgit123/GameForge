import { Router } from 'express';
import { PromotionType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

export const promotionsRouter = Router();

// Admin: create a promotion. Local-only — see docs/API_INTEGRATION.md
// #promotion-api for why there's no Surfboard call here.
promotionsRouter.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { code, type, value, startsAt, endsAt, usageLimit } = req.body ?? {};
    if (
      !code ||
      !type ||
      !Object.values(PromotionType).includes(type) ||
      typeof value !== 'number' ||
      !startsAt ||
      !endsAt ||
      typeof usageLimit !== 'number'
    ) {
      return res
        .status(400)
        .json({ error: 'code, type (PERCENTAGE|FIXED_AMOUNT), value, startsAt, endsAt, and usageLimit are required' });
    }

    const existing = await prisma.promotion.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ error: 'A promotion with this code already exists' });
    }

    const promotion = await prisma.promotion.create({
      data: {
        code,
        type,
        value,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        usageLimit,
      },
    });
    res.status(201).json({ promotion });
  })
);

// Admin: list promotions, with current usage counts.
promotionsRouter.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const promotions = await prisma.promotion.findMany({
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { usages: true } } },
    });
    res.json({ promotions });
  })
);
