import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { WishlistButton } from '../components/WishlistButton';
import { GameCard } from '../components/GameCard';
import { GamePoster } from '../components/GamePoster';
import { hasRealCoverImage } from '../lib/posterArt';
import type { Game } from '../lib/types';

export function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { addToCart, isInCart } = useCart();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [related, setRelated] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ game: Game }>(`/games/${id}`)
      .then((res) => setGame(res.game))
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404 ? 'Game not found.' : 'Could not load this game.');
      });
  }, [id]);

  useEffect(() => {
    if (!game) return;
    api.get<{ games: Game[] }>('/games').then((res) => {
      const others = res.games.filter((g) => g.id !== game.id);
      const sameGenre = game.genre ? others.filter((g) => g.genre === game.genre) : [];
      const pool = sameGenre.length > 0 ? sameGenre : others.filter((g) => g.publisherId === game.publisherId);
      setRelated(pool.slice(0, 5));
    });
  }, [game]);

  // Untouched from the original implementation — same checkout call, same
  // redirect/confirmation logic. Only the surrounding page is restyled.
  async function onBuyNow() {
    if (!id) return;
    setCheckoutError(null);
    setStartingCheckout(true);
    try {
      const res = await api.post<{ orderId: string; paymentPageLink: string | null }>(
        '/checkout',
        {
          gameIds: [id],
          promoCode: promoCode || undefined,
          giftCardCode: giftCardCode || undefined,
        },
        token
      );
      if (res.paymentPageLink) {
        window.location.href = res.paymentPageLink;
      } else {
        // Gift card fully covered the order — no hosted page to redirect to.
        navigate(`/orders/${res.orderId}/confirmation`);
      }
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : 'Could not start checkout. Try again.');
      setStartingCheckout(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="mb-4 font-display text-xl font-semibold text-steam-100">{error}</h2>
        <Link to="/" className="rounded-md border border-iron-700 px-4 py-2 text-steam-100 hover:bg-iron-800">
          Back to storefront
        </Link>
      </div>
    );
  }

  if (!game) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-steam-400">Loading…</div>;
  }

  const realCover = hasRealCoverImage(game.coverImageUrl) ? [game.coverImageUrl] : [];
  const realScreenshots = game.screenshotUrls.filter(hasRealCoverImage);
  const gallery = [...realCover, ...realScreenshots];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="relative mb-4 aspect-video overflow-hidden rounded-2xl bg-iron-800">
        {gallery.length > 0 ? (
          <img src={gallery[galleryIndex]} alt="" className="h-full w-full object-cover" />
        ) : (
          <GamePoster title={game.title} genre={game.genre} seed={game.id} showText={false} />
        )}
        <WishlistButton gameId={game.id} className="absolute right-4 top-4" />
      </div>

      {gallery.length > 1 && (
        <div className="mb-8 flex gap-2 overflow-x-auto">
          {gallery.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setGalleryIndex(i)}
              className={`h-16 w-28 shrink-0 overflow-hidden rounded-md border-2 ${
                i === galleryIndex ? 'border-ember' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold text-steam-100">{game.title}</h1>
          <p className="mb-4 text-sm text-steam-400">
            By {game.publisherName} · Released {new Date(game.createdAt).toLocaleDateString()}
          </p>
          {(game.genre || game.platform) && (
            <div className="mb-4 flex gap-2">
              {game.genre && <span className="rounded bg-iron-800 px-2 py-1 text-xs text-steam-400">{game.genre}</span>}
              {game.platform && <span className="rounded bg-iron-800 px-2 py-1 text-xs text-steam-400">{game.platform}</span>}
            </div>
          )}
          <p className="mb-8 leading-relaxed text-steam-400">{game.description}</p>

          <section className="mb-8">
            <h2 className="mb-3 font-display text-lg font-semibold text-steam-100">System requirements</h2>
            {game.systemRequirements ? (
              <pre className="whitespace-pre-wrap rounded-lg border border-iron-700 bg-iron-900 p-4 font-mono text-sm text-steam-400">
                {game.systemRequirements}
              </pre>
            ) : (
              <p className="text-sm text-steam-600">Not provided by the publisher yet.</p>
            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-display text-lg font-semibold text-steam-100">Reviews</h2>
            <p className="text-sm text-steam-600">No reviews yet.</p>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-iron-700 bg-iron-900 p-5">
          <div className="mb-4 font-mono text-2xl font-semibold text-steam-100">
            {formatMoney(game.price, game.currency)}
          </div>

          <div className="mb-4 space-y-2">
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

          {checkoutError && (
            <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{checkoutError}</div>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onBuyNow}
            disabled={startingCheckout}
            className="mb-2 w-full rounded-md bg-ember py-3 font-semibold text-iron-900 transition-colors hover:bg-[#ff6a43] disabled:opacity-50"
          >
            {startingCheckout ? 'Starting checkout…' : 'Buy now'}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => addToCart(game.id)}
            disabled={isInCart(game.id)}
            className="w-full rounded-md border border-iron-700 py-3 font-semibold text-steam-100 transition-colors hover:bg-iron-800 disabled:opacity-50"
          >
            {isInCart(game.id) ? 'In cart' : 'Add to cart'}
          </motion.button>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-lg font-semibold text-steam-100">Related games</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {related.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
