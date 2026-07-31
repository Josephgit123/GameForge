import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Game } from '../lib/types';

function statusBadgeClass(status: Game['status']) {
  if (status === 'PUBLISHED') return 'badge badge-success';
  if (status === 'DRAFT') return 'badge badge-warning';
  return 'badge badge-danger';
}

export function ManageGames() {
  const { token } = useAuth();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function refresh() {
    api
      .get<{ games: Game[] }>('/admin/games', token)
      .then((res) => setGames(res.games))
      .catch(() => setError('Could not load games.'));
  }

  useEffect(refresh, [token]);

  async function setStatus(game: Game, status: Game['status']) {
    setActingId(game.id);
    setError(null);
    try {
      await api.patch(`/games/${game.id}`, { status }, token);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not update "${game.title}".`);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Manage games</h1>
      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}
      {!error && !games && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {games && games.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No games in the catalog yet.</p>}

      {games && games.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {games.map((game) => (
            <div key={game.id} className="panel-card row" style={{ justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
              <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{game.title}</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--steam-400)' }}>
                  {game.publisherName} · {formatMoney(game.price, game.currency)}
                </span>
              </div>
              <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
                <span className={statusBadgeClass(game.status)}>{game.status}</span>
                {game.status !== 'PUBLISHED' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={actingId === game.id}
                    onClick={() => setStatus(game, 'PUBLISHED')}
                  >
                    Publish
                  </button>
                )}
                {game.status !== 'DRAFT' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={actingId === game.id}
                    onClick={() => setStatus(game, 'DRAFT')}
                  >
                    Unpublish
                  </button>
                )}
                {game.status !== 'DELISTED' && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={actingId === game.id}
                    onClick={() => setStatus(game, 'DELISTED')}
                  >
                    Delist
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
