import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Game } from '../lib/types';

export function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ game: Game }>(`/games/${id}`)
      .then((res) => setGame(res.game))
      .catch((err) => {
        setError(err instanceof ApiError && err.status === 404 ? 'Game not found.' : 'Could not load this game.');
      });
  }, [id]);

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
      <button type="button" className="btn btn-primary btn-lg" disabled title="Checkout ships in Phase 3">
        Buy now
      </button>
    </div>
  );
}
