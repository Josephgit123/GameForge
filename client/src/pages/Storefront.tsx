import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import { useAuth } from '../context/AuthContext';
import type { Game } from '../lib/types';

const SLIDE_INTERVAL_MS = 5000;

export function Storefront() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    api
      .get<{ games: Game[] }>('/games')
      .then((res) => setGames(res.games))
      .catch(() => setError('Could not load the storefront right now.'));
  }, []);

  const slideCount = games?.length ?? 0;
  useEffect(() => {
    if (paused || slideCount < 2) return;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % slideCount);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, slideCount]);

  const featured = games && games.length > 0 ? games[heroIndex % games.length] : null;

  return (
    <div>
      {featured && (
        <div className="page" style={{ paddingBottom: 0 }}>
          <h2 style={{ marginBottom: 'var(--sp-4)' }}>Featured &amp; Recommended</h2>
          <div
            className="store-hero"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="store-hero-media"
              style={
                featured.coverImageUrl
                  ? { backgroundImage: `url(${featured.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : undefined
              }
            >
              {games && games.length > 1 && (
                <>
                  <button
                    type="button"
                    className="store-hero-arrow store-hero-arrow-prev"
                    aria-label="Previous game"
                    onClick={() => setHeroIndex((i) => (i - 1 + games.length) % games.length)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="store-hero-arrow store-hero-arrow-next"
                    aria-label="Next game"
                    onClick={() => setHeroIndex((i) => (i + 1) % games.length)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                  <div className="store-hero-dots">
                    {games.map((g, i) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`store-hero-dot${i === heroIndex % games.length ? ' active' : ''}`}
                        aria-label={`Show ${g.title}`}
                        onClick={() => setHeroIndex(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="store-hero-info">
              <span className="store-hero-eyebrow">Featured</span>
              <h1>{featured.title}</h1>
              <p>{featured.description}</p>
              <span className="store-hero-price">{formatMoney(featured.price, featured.currency)}</span>
              {isCustomer && (
                <Link to={`/games/${featured.id}`} className="btn btn-primary btn-block">
                  View game
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="page">
        {error && <div className="form-error-banner">{error}</div>}
        {!error && !games && <p style={{ color: 'var(--steam-400)' }}>Loading games…</p>}
        {games && games.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No games published yet.</p>}

        {games && games.length > 0 && (
          <>
            <h2 style={{ marginBottom: 'var(--sp-6)' }}>All games</h2>
            {!isCustomer && (
              <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-4)', fontSize: 14 }}>
                <Link to="/login">Log in as a customer</Link> to view and purchase games.
              </p>
            )}
            <div className="grid-cards">
              {games.map((game) => {
                const cover = (
                  <div
                    className="cover"
                    style={
                      game.coverImageUrl
                        ? { backgroundImage: `url(${game.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : undefined
                    }
                  />
                );
                const body = (
                  <div className="body">
                    <span className="title">{game.title}</span>
                    <span className="price">{formatMoney(game.price, game.currency)}</span>
                  </div>
                );
                return isCustomer ? (
                  <Link key={game.id} to={`/games/${game.id}`} className="game-card">
                    {cover}
                    {body}
                  </Link>
                ) : (
                  <div key={game.id} className="game-card game-card-locked">
                    {cover}
                    {body}
                    <span className="game-card-lock-hint">Log in to view</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
