import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { GameCard } from '../components/GameCard';
import type { Game } from '../lib/types';

export function Wishlist() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const { gameIds } = useWishlist();
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    api.get<{ games: Game[] }>('/games').then((res) => {
      setGames(res.games.filter((g) => gameIds.includes(g.id)));
    });
  }, [gameIds]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-steam-100">Wishlist</h1>

      {games && games.length === 0 && (
        <p className="text-steam-400">Nothing here yet — tap the heart on any game to save it for later.</p>
      )}

      {games && games.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {games.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4) }}
            >
              <GameCard game={game} interactive={isCustomer} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
