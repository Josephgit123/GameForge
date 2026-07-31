import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';

// Public, read-only browse endpoint over the RawgGame reference table (see
// schema.prisma / services/rawg.ts). This is an informational "Discover"
// surface only — no price, no relation to Game/Order/Payment, nothing here
// is or can be purchased through GameForge.
export const discoverRouter = Router();

discoverRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const genre = typeof req.query.genre === 'string' ? req.query.genre.trim() : '';

    const games = await prisma.rawgGame.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(genre ? { genres: { has: genre } } : {}),
      },
      orderBy: { rating: 'desc' },
    });
    res.json({ games, total: games.length });
  })
);
