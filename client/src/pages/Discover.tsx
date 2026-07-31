import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { GameCardSkeleton } from '../components/SkeletonLoader';
import type { RawgGame } from '../lib/types';

// Real-world game info, sourced from RAWG (https://rawg.io) for browsing
// only. Deliberately has no price, no "Add to cart"/"Buy now", and no link
// into GameForge's storefront/checkout — this is reference data, not
// inventory.
export function Discover() {
  const [games, setGames] = useState<RawgGame[] | null>(null);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ games: RawgGame[] }>('/discover').then((res) => setGames(res.games));
  }, []);

  const genres = useMemo(
    () => Array.from(new Set((games ?? []).flatMap((g) => g.genres))).sort(),
    [games]
  );

  const filtered = (games ?? []).filter((g) => {
    const matchesSearch = !search || g.name.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = !genre || g.genres.includes(genre);
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-2 font-display text-2xl font-bold text-steam-100">Discover</h1>
      <p className="mb-6 max-w-2xl text-sm text-steam-400">
        Real-world game info from the{' '}
        <a href="https://rawg.io" target="_blank" rel="noreferrer" className="text-ember hover:underline">
          RAWG
        </a>{' '}
        database, for browsing only — these titles aren’t sold on GameForge and can’t be added to your cart.
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search real games…"
          className="w-full max-w-xs rounded-md border border-iron-700 bg-iron-900 px-3 py-2 text-sm text-steam-100 placeholder:text-steam-400 focus:border-ember focus:outline-none"
        />
        <select
          value={genre ?? ''}
          onChange={(e) => setGenre(e.target.value || null)}
          className="rounded-md border border-iron-700 bg-iron-900 px-3 py-2 text-sm text-steam-100 focus:border-ember focus:outline-none"
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {!games && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      )}

      {games && filtered.length === 0 && <p className="text-steam-400">No matches.</p>}

      {games && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
              className="overflow-hidden rounded-lg border border-iron-700 bg-iron-900"
            >
              <div className="aspect-[16/9] bg-iron-800">
                {game.backgroundImage ? (
                  <img src={game.backgroundImage} alt={game.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-steam-400">No image</div>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <span className="truncate font-display text-sm font-semibold text-steam-100">{game.name}</span>
                <span className="truncate text-xs text-steam-400">{game.genres.join(', ') || '—'}</span>
                <div className="flex items-center justify-between text-xs text-steam-400">
                  <span>{game.released ? new Date(game.released).getFullYear() : '—'}</span>
                  {game.rating != null && (
                    <span className="flex items-center gap-1 text-steam-100">
                      ★ {game.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
