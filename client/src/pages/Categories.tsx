import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { GameCard } from '../components/GameCard';
import { GameCardSkeleton } from '../components/SkeletonLoader';
import { Filters } from '../components/Filters';
import type { Game } from '../lib/types';

export function Categories() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const [games, setGames] = useState<Game[] | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ games: Game[] }>('/games').then((res) => setGames(res.games));
  }, []);

  const genres = useMemo(
    () => Array.from(new Set((games ?? []).map((g) => g.genre).filter((g): g is string => Boolean(g)))).sort(),
    [games]
  );
  const platforms = useMemo(
    () => Array.from(new Set((games ?? []).map((g) => g.platform).filter((p): p is string => Boolean(p)))).sort(),
    [games]
  );

  const filtered = (games ?? []).filter(
    (g) => (!genre || g.genre === genre) && (!platform || g.platform === platform)
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-steam-100">Categories</h1>

      {!isCustomer && (
        <p className="mb-4 text-sm text-steam-400">
          <Link to="/login" className="text-ember hover:underline">
            Log in as a customer
          </Link>{' '}
          to view and purchase games.
        </p>
      )}

      {games && genres.length === 0 && platforms.length === 0 ? (
        <p className="text-steam-400">
          No genre or platform tags yet — publishers haven't set them on any game. Once they do, filters will appear
          here.
        </p>
      ) : (
        <div className="flex gap-8">
          <Filters
            genres={genres}
            platforms={platforms}
            selectedGenre={genre}
            selectedPlatform={platform}
            onGenreChange={setGenre}
            onPlatformChange={setPlatform}
          />
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {!games &&
              Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={i} />)}
            {games && filtered.length === 0 && (
              <p className="col-span-full text-steam-400">No games match these filters.</p>
            )}
            {filtered.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
              >
                <GameCard game={game} interactive={isCustomer} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
