import { Router } from 'express';
import { PublisherStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

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
