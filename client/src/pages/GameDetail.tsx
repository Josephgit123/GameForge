import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import { useAuth } from '../context/AuthContext';
import type { Game } from '../lib/types';

export function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .get<{ game: Game }>(`/games/${id}`)
      .then((res) => setGame(res.game))
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404 ? 'Game not found.' : 'Could not load this game.');
      });
  }, [id]);

  async function onBuyNow() {
    if (!id) return;
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/games/${id}` } } });
      return;
    }
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
      <div className="page">
        <div className="panel-card">
          <h2>{error}</h2>
          <Link to="/" className="btn btn-secondary" style={{ marginTop: 'var(--sp-4)' }}>
            Back to storefront
          </Link>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <p style={{ color: 'var(--steam-400)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="cover-hero" style={{ borderRadius: 'var(--r-lg)', height: 240, marginBottom: 'var(--sp-6)' }} />
      <h1>{game.title}</h1>
      <p className="mono" style={{ fontSize: 20, color: 'var(--steam-100)', margin: 'var(--sp-3) 0 var(--sp-6)' }}>
        {formatMoney(game.price, game.currency)}
      </p>
      <p style={{ color: 'var(--steam-400)', lineHeight: 1.7, marginBottom: 'var(--sp-8)' }}>{game.description}</p>

      <div className="row" style={{ gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
        <div className="wallet-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
          </svg>
          <input
            type="text"
            placeholder="Promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="wallet-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M20 7H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
          <input
            type="text"
            placeholder="Gift card code"
            value={giftCardCode}
            onChange={(e) => setGiftCardCode(e.target.value)}
          />
        </div>
      </div>

      {checkoutError && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-4)' }}>{checkoutError}</div>}
      <button type="button" className="btn btn-primary btn-lg" onClick={onBuyNow} disabled={startingCheckout}>
        {startingCheckout ? 'Starting checkout…' : 'Buy now'}
      </button>
    </div>
  );
}
