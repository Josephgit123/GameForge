import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Game } from '../lib/types';

export function Storefront() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ games: Game[] }>('/games')
      .then((res) => setGames(res.games))
      .catch(() => setError('Could not load the storefront right now.'));
  }, []);

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Storefront</h1>
      {error && <div className="form-error-banner">{error}</div>}
      {!error && !games && <p style={{ color: 'var(--steam-400)' }}>Loading games…</p>}
      {games && games.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No games published yet.</p>}
      {games && games.length > 0 && (
        <div className="grid-cards">
          {games.map((game) => (
            <Link key={game.id} to={`/games/${game.id}`} className="game-card">
              <div className="cover" />
              <div className="body">
                <span className="title">{game.title}</span>
                <span className="price">{formatMoney(game.price, game.currency)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
