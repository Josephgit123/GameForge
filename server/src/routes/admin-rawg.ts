import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { RawgApiError, RawgNotConfiguredError, getGameDescription, listPopularGames, type RawgListItem } from '../services/rawg';

// Admin-only, read-only reference data import from RAWG. Writes exclusively
// to the standalone RawgGame table (see schema.prisma) — never touches
// Game/Order/Payment/checkout. Nothing here is reachable from the customer
// storefront or Surfboard checkout flow.
export const adminRawgRouter = Router();

const MIN_GAMES = 100;
const MAX_GAMES = 200;
const DEFAULT_GAMES = 150;
const PAGE_SIZE = 40;

function toDbFields(item: RawgListItem, description: string | null) {
  return {
    slug: item.slug,
    name: item.name,
    description,
    backgroundImage: item.background_image,
    released: item.released,
    rating: item.rating,
    metacritic: item.metacritic,
    esrbRating: item.esrb_rating?.name ?? null,
    genres: item.genres.map((g) => g.name),
    platforms: (item.platforms ?? []).map((p) => p.platform.name),
  };
}

// Admin: one-time (re-runnable) import of RAWG reference games.
// Body: { count?: number } — clamped to [100, 200], defaults to 150.
adminRawgRouter.post(
  '/import',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const requested = Math.min(MAX_GAMES, Math.max(MIN_GAMES, Number(req.body?.count) || DEFAULT_GAMES));

    const collected: RawgListItem[] = [];
    let page = 1;
    try {
      while (collected.length < requested) {
        const batch = await listPopularGames(page, PAGE_SIZE);
        if (batch.length === 0) break;
        collected.push(...batch);
        page += 1;
        if (page > 20) break; // hard stop — never loop indefinitely on an unexpected RAWG response
      }
    } catch (err) {
      if (err instanceof RawgNotConfiguredError) {
        return res.status(503).json({ error: 'RAWG_API_KEY is not configured on this server' });
      }
      if (err instanceof RawgApiError) {
        return res.status(502).json({ error: `RAWG rejected the request (status ${err.status})`, detail: err.body });
      }
      throw err;
    }

    const toImport = collected.slice(0, requested);

    let imported = 0;
    let updated = 0;
    for (const item of toImport) {
      // One extra call per game for description_raw (not present on the list
      // endpoint). Small delay between calls to stay well under RAWG's rate
      // limit during a 100-200 game one-off import.
      let description: string | null = null;
      try {
        description = await getGameDescription(item.id);
      } catch {
        // Non-fatal — importing without a description beats failing the whole batch.
      }
      await new Promise((r) => setTimeout(r, 200));

      const fields = toDbFields(item, description);
      const existing = await prisma.rawgGame.findUnique({ where: { rawgId: item.id } });
      if (existing) {
        await prisma.rawgGame.update({ where: { rawgId: item.id }, data: fields });
        updated += 1;
      } else {
        await prisma.rawgGame.create({ data: { rawgId: item.id, ...fields } });
        imported += 1;
      }
    }

    const total = await prisma.rawgGame.count();
    res.status(201).json({ requested, imported, updated, total });
  })
);

// Admin: list imported RAWG reference games (verification only — no
// customer-facing route exists for this table yet).
adminRawgRouter.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const games = await prisma.rawgGame.findMany({ orderBy: { importedAt: 'desc' } });
    res.json({ games, total: games.length });
  })
);
