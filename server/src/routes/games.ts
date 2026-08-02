import { Router } from 'express';
import { GameStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

export const gamesRouter = Router();

// Additive, read-only convenience for the storefront — flattens the
// publisher's display name onto the game object instead of making every
// card component reach through publisher.user itself.
function withPublisherName<T extends { publisher: { user: { firstName: string; lastName: string } } }>(game: T) {
  const { publisher, ...rest } = game;
  return { ...rest, publisherName: `${publisher.user.firstName} ${publisher.user.lastName}` };
}
const PUBLISHER_NAME_INCLUDE = { publisher: { include: { user: true } } } as const;

// Public: browse published games only.
gamesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const games = await prisma.game.findMany({
      where: { status: GameStatus.PUBLISHED },
      orderBy: { title: 'asc' },
      include: PUBLISHER_NAME_INCLUDE,
    });
    res.json({ games: games.map(withPublisherName) });
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

// Public: games ranked by units sold (completed orders only). Must be
// registered before /:id so "top-sellers" isn't swallowed as a game id.
gamesRouter.get(
  '/top-sellers',
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.orderItem.groupBy({
      by: ['gameId'],
      where: { order: { status: 'PAID' } },
      _count: { gameId: true },
      orderBy: { _count: { gameId: 'desc' } },
    });

    const games = await prisma.game.findMany({
      where: { id: { in: grouped.map((g) => g.gameId) }, status: GameStatus.PUBLISHED },
      include: PUBLISHER_NAME_INCLUDE,
    });
    const gameById = new Map(games.map((g) => [g.id, withPublisherName(g)]));

    const ranked = grouped
      .map((g) => ({ game: gameById.get(g.gameId), unitsSold: g._count.gameId }))
      .filter((r): r is { game: NonNullable<typeof r.game>; unitsSold: number } => Boolean(r.game));

    res.json({ games: ranked });
  })
);

// Public: game detail. Non-published games 404 for anonymous/other users.
gamesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: PUBLISHER_NAME_INCLUDE,
    });
    if (!game || game.status !== GameStatus.PUBLISHED) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ game: withPublisherName(game) });
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

    const {
      title,
      description,
      price,
      currency,
      coverImageUrl,
      genre,
      platform,
      screenshotUrls,
      systemRequirements,
      earlyAccess,
      beta,
      gameForgePlusExclusive,
    } = req.body ?? {};
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
        genre: genre || null,
        platform: platform || null,
        screenshotUrls: Array.isArray(screenshotUrls) ? screenshotUrls : [],
        systemRequirements: systemRequirements || null,
        status: GameStatus.DRAFT,
        earlyAccess: Boolean(earlyAccess),
        beta: Boolean(beta),
        gameForgePlusExclusive: Boolean(gameForgePlusExclusive),
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

    const {
      title,
      description,
      price,
      currency,
      status,
      coverImageUrl,
      genre,
      platform,
      screenshotUrls,
      systemRequirements,
      earlyAccess,
      beta,
      gameForgePlusExclusive,
      featured,
    } = req.body ?? {};

    if (status !== undefined) {
      const allowedForRole =
        req.user!.role === Role.ADMIN ? Object.values(GameStatus) : [GameStatus.DRAFT, GameStatus.PUBLISHED];
      if (!allowedForRole.includes(status)) {
        return res.status(403).json({ error: `You cannot set status to ${status}` });
      }
    }

    // "Featured" (admin's Featured Member Games control) is admin-only —
    // a publisher can mark their own games early-access/beta/exclusive,
    // but not feature themselves.
    if (featured !== undefined && req.user!.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Only an admin can set featured' });
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
        ...(genre !== undefined && { genre: genre || null }),
        ...(platform !== undefined && { platform: platform || null }),
        ...(screenshotUrls !== undefined && { screenshotUrls: Array.isArray(screenshotUrls) ? screenshotUrls : [] }),
        ...(systemRequirements !== undefined && { systemRequirements: systemRequirements || null }),
        ...(earlyAccess !== undefined && { earlyAccess: Boolean(earlyAccess) }),
        ...(beta !== undefined && { beta: Boolean(beta) }),
        ...(gameForgePlusExclusive !== undefined && { gameForgePlusExclusive: Boolean(gameForgePlusExclusive) }),
        ...(featured !== undefined && { featured: Boolean(featured) }),
      },
    });
    res.json({ game: updated });
  })
);
