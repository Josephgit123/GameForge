import { Router } from 'express';
import { GameStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

export const gamesRouter = Router();

// Public: browse published games only.
gamesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const games = await prisma.game.findMany({
      where: { status: GameStatus.PUBLISHED },
      orderBy: { title: 'asc' },
    });
    res.json({ games });
  })
);

// Publisher: list their own games, including drafts.
gamesRouter.get(
  '/mine/all',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await prisma.publisher.findUnique({ where: { userId: req.user!.id } });
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }
    const games = await prisma.game.findMany({
      where: { publisherId: publisher.id },
      orderBy: { title: 'asc' },
    });
    res.json({ games });
  })
);

// Public: game detail. Non-published games 404 for anonymous/other users.
gamesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!game || game.status !== GameStatus.PUBLISHED) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ game });
  })
);

// Publisher: create a game under their own, already-approved Publisher.
gamesRouter.post(
  '/',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await prisma.publisher.findUnique({ where: { userId: req.user!.id } });
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }
    if (publisher.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Your publisher account is not yet approved' });
    }

    const { title, description, price, currency, coverImageUrl } = req.body ?? {};
    if (!title || !description || typeof price !== 'number' || !Number.isInteger(price) || !currency) {
      return res
        .status(400)
        .json({ error: 'title, description, price (integer, minor units), and currency are required' });
    }

    const game = await prisma.game.create({
      data: {
        publisherId: publisher.id,
        title,
        description,
        price,
        currency,
        coverImageUrl: coverImageUrl || null,
        status: GameStatus.DRAFT,
      },
    });
    res.status(201).json({ game });
  })
);

// Publisher: edit their own game (title/description/price/currency, DRAFT<->PUBLISHED).
// Admin: edit any game, including delisting it.
gamesRouter.patch(
  '/:id',
  requireAuth,
  requireRole(Role.PUBLISHER, Role.ADMIN),
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (req.user!.role === Role.PUBLISHER) {
      const publisher = await prisma.publisher.findUnique({ where: { userId: req.user!.id } });
      if (!publisher || game.publisherId !== publisher.id) {
        return res.status(403).json({ error: 'You can only edit your own games' });
      }
    }

    const { title, description, price, currency, status, coverImageUrl } = req.body ?? {};

    if (status !== undefined) {
      const allowedForRole =
        req.user!.role === Role.ADMIN ? Object.values(GameStatus) : [GameStatus.DRAFT, GameStatus.PUBLISHED];
      if (!allowedForRole.includes(status)) {
        return res.status(403).json({ error: `You cannot set status to ${status}` });
      }
    }

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(currency !== undefined && { currency }),
        ...(status !== undefined && { status }),
        ...(coverImageUrl !== undefined && { coverImageUrl: coverImageUrl || null }),
      },
    });
    res.json({ game: updated });
  })
);
