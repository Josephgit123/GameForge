import { Router } from 'express';
import { OrderStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

export const analyticsRouter = Router();

// One sales chart, computed from local Order rows — never a live
// Surfboard call, per CLAUDE.md.
analyticsRouter.get(
  '/sales',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      where: { status: OrderStatus.PAID },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay = new Map<string, { date: string; totalRevenue: number; orderCount: number }>();
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(date) ?? { date, totalRevenue: 0, orderCount: 0 };
      existing.totalRevenue += order.totalAmount;
      existing.orderCount += 1;
      byDay.set(date, existing);
    }

    res.json({ sales: Array.from(byDay.values()) });
  })
);

// One revenue-per-publisher table, derived from OrderItem/Game — no
// separate write anywhere, per CLAUDE.md's post-payment sequence step 7.
analyticsRouter.get(
  '/revenue-by-publisher',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const items = await prisma.orderItem.findMany({
      where: { order: { status: OrderStatus.PAID } },
      select: {
        priceAtPurchase: true,
        game: {
          select: {
            publisherId: true,
            publisher: { select: { user: { select: { email: true, firstName: true, lastName: true } } } },
          },
        },
      },
    });

    const byPublisher = new Map<
      string,
      { publisherId: string; publisherEmail: string; totalRevenue: number; gamesSold: number }
    >();
    for (const item of items) {
      const publisherId = item.game.publisherId;
      const existing = byPublisher.get(publisherId) ?? {
        publisherId,
        publisherEmail: item.game.publisher.user.email,
        totalRevenue: 0,
        gamesSold: 0,
      };
      existing.totalRevenue += item.priceAtPurchase;
      existing.gamesSold += 1;
      byPublisher.set(publisherId, existing);
    }

    res.json({ revenueByPublisher: Array.from(byPublisher.values()) });
  })
);
