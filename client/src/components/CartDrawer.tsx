import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import { GamePoster } from './GamePoster';
import { hasRealCoverImage } from '../lib/posterArt';
import type { Game } from '../lib/types';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { gameIds, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    if (!open) return;
    api.get<{ games: Game[] }>('/games').then((res) => {
      setGames(res.games.filter((g) => gameIds.includes(g.id)));
    });
  }, [open, gameIds]);

  const total = games.reduce((sum, g) => sum + g.price, 0);
  const currency = games[0]?.currency ?? 'SEK';

  function goToCheckout() {
    onClose();
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-iron-700 bg-iron-900 p-6"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-steam-100">Cart ({games.length})</h2>
              <button type="button" onClick={onClose} aria-label="Close cart" className="text-steam-400 hover:text-steam-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {games.length === 0 && <p className="text-steam-400">Your cart is empty.</p>}

            <div className="flex-1 space-y-3 overflow-y-auto">
              {games.map((game) => (
                <Link
                  key={game.id}
                  to={`/games/${game.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg border border-iron-700 p-3 hover:border-iron-600"
                >
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-iron-800">
                    {hasRealCoverImage(game.coverImageUrl) ? (
                      <img src={game.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <GamePoster title={game.title} genre={game.genre} seed={game.id} showText={false} />
                    )}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="truncate text-sm font-medium text-steam-100">{game.title}</div>
                    <div className="font-mono text-xs text-steam-400">{formatMoney(game.price, game.currency)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromCart(game.id);
                    }}
                    aria-label={`Remove ${game.title}`}
                    className="text-steam-600 hover:text-danger"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </Link>
              ))}
            </div>

            {games.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-iron-700 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-steam-400">Total</span>
                  <span className="font-mono text-lg font-semibold text-steam-100">{formatMoney(total, currency)}</span>
                </div>
                <button
                  type="button"
                  onClick={goToCheckout}
                  className="w-full rounded-md bg-ember py-3 font-semibold text-iron-900 transition-colors hover:bg-[#ff6a43]"
                >
                  Go to checkout
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
