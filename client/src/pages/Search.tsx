import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { GameCard } from '../components/GameCard';
import { GameCardSkeleton } from '../components/SkeletonLoader';
import { SearchBar } from '../components/SearchBar';
import type { Game } from '../lib/types';

export function Search() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    api.get<{ games: Game[] }>('/games').then((res) => setGames(res.games));
  }, []);

  const q = query.trim().toLowerCase();
  const results = (games ?? []).filter(
    (g) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-2 font-display text-2xl font-bold text-steam-100">Search</h1>
      <SearchBar className="mb-6 max-w-md" />

      {!games && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      )}

      {games && query && (
        <p className="mb-4 text-sm text-steam-400">
          {results.length} result{results.length === 1 ? '' : 's'} for "{query}"
        </p>
      )}

      {games && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
            >
              <GameCard game={game} interactive={isCustomer} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
