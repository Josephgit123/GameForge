import { Router, type Request } from 'express';
import { OrderStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

export const analyticsRouter = Router();

// Publisher-scoped sales — same "derived from Order/OrderItem, no separate
// write" rule as the admin queries above, just filtered down to the calling
// publisher's own games instead of every publisher.
async function requirePublisher(req: Request) {
  return prisma.publisher.findUnique({ where: { userId: req.user!.id } });
}

analyticsRouter.get(
  '/publisher/sales',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await requirePublisher(req);
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }

    const items = await prisma.orderItem.findMany({
      where: { order: { status: OrderStatus.PAID }, game: { publisherId: publisher.id } },
      select: { priceAtPurchase: true, order: { select: { createdAt: true } } },
    });

    const byDay = new Map<string, { date: string; totalRevenue: number; unitsSold: number }>();
    for (const item of items) {
      const date = item.order.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(date) ?? { date, totalRevenue: 0, unitsSold: 0 };
      existing.totalRevenue += item.priceAtPurchase;
      existing.unitsSold += 1;
      byDay.set(date, existing);
    }

    const sales = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
    res.json({ sales });
  })
);

analyticsRouter.get(
  '/publisher/by-game',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await requirePublisher(req);
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }

    const items = await prisma.orderItem.findMany({
      where: { order: { status: OrderStatus.PAID }, game: { publisherId: publisher.id } },
      select: { priceAtPurchase: true, game: { select: { id: true, title: true } } },
    });

    const byGame = new Map<string, { gameId: string; title: string; unitsSold: number; totalRevenue: number }>();
    for (const item of items) {
      const existing = byGame.get(item.game.id) ?? {
        gameId: item.game.id,
        title: item.game.title,
        unitsSold: 0,
        totalRevenue: 0,
      };
      existing.unitsSold += 1;
      existing.totalRevenue += item.priceAtPurchase;
      byGame.set(item.game.id, existing);
    }

    const games = Array.from(byGame.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
    res.json({ games });
  })
);
