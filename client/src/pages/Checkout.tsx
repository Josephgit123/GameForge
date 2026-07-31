import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import { GamePoster } from '../components/GamePoster';
import { hasRealCoverImage } from '../lib/posterArt';
import type { Game } from '../lib/types';

export function Checkout() {
  const { gameIds, removeFromCart, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[] | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<{ games: Game[] }>('/games').then((res) => {
      setGames(res.games.filter((g) => gameIds.includes(g.id)));
    });
  }, [gameIds]);

  const total = (games ?? []).reduce((sum, g) => sum + g.price, 0);
  const currency = games?.[0]?.currency ?? 'SEK';

  async function onPay() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ orderId: string; paymentPageLink: string | null }>(
        '/checkout',
        { gameIds, promoCode: promoCode || undefined, giftCardCode: giftCardCode || undefined },
        token
      );
      clearCart();
      if (res.paymentPageLink) {
        window.location.href = res.paymentPageLink;
      } else {
        navigate(`/orders/${res.orderId}/confirmation`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start checkout. Try again.');
      setSubmitting(false);
    }
  }

  if (games && games.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-4 font-display text-2xl font-bold text-steam-100">Your cart is empty</h1>
        <Link to="/" className="text-ember hover:underline">
          Back to the storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-steam-100">Checkout</h1>

      <div className="mb-6 space-y-3 rounded-2xl border border-iron-700 bg-iron-900 p-5">
        {!games && <p className="text-steam-400">Loading…</p>}
        {games?.map((game) => (
          <div key={game.id} className="flex items-center gap-3">
            <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-iron-800">
              {hasRealCoverImage(game.coverImageUrl) ? (
                <img src={game.coverImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <GamePoster title={game.title} genre={game.genre} seed={game.id} showText={false} />
              )}
            </div>
            <div className="flex-1 truncate">
              <div className="truncate text-sm font-medium text-steam-100">{game.title}</div>
            </div>
            <div className="font-mono text-sm text-steam-100">{formatMoney(game.price, game.currency)}</div>
            <button
              type="button"
              onClick={() => removeFromCart(game.id)}
              className="text-xs text-steam-600 hover:text-danger"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mb-6 space-y-3 rounded-2xl border border-iron-700 bg-iron-900 p-5">
        <h2 className="font-display text-sm font-semibold text-steam-100">Promotions & gift cards</h2>
        <input
          type="text"
          placeholder="Promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none placeholder:text-steam-600 focus:border-ember"
        />
        <input
          type="text"
          placeholder="Gift card code"
          value={giftCardCode}
          onChange={(e) => setGiftCardCode(e.target.value)}
          className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none placeholder:text-steam-600 focus:border-ember"
        />
      </div>

      <div className="mb-6 rounded-2xl border border-iron-700 bg-iron-900 p-5">
        <div className="flex items-center justify-between text-sm text-steam-400">
          <span>Subtotal</span>
          <span className="font-mono">{formatMoney(total, currency)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-iron-700 pt-2 text-base font-semibold text-steam-100">
          <span>Total</span>
          <span className="font-mono">{formatMoney(total, currency)}</span>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onPay}
        disabled={submitting || !games || games.length === 0}
        className="w-full rounded-md bg-ember py-3 font-semibold text-iron-900 transition-colors hover:bg-[#ff6a43] disabled:opacity-50"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-iron-900/30 border-t-iron-900" />
            Starting checkout…
          </span>
        ) : (
          'Pay with Surfboard'
        )}
      </motion.button>
      <p className="mt-2 text-center text-xs text-steam-600">
        A gift card code that fully covers the total completes instantly — otherwise you'll be redirected to
        Surfboard's secure payment page.
      </p>
    </div>
  );
}
