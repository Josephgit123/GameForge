import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Game, PublisherStatusInfo } from '../lib/types';

function statusBadgeClass(status: Game['status']) {
  if (status === 'PUBLISHED') return 'badge badge-success';
  if (status === 'DRAFT') return 'badge badge-warning';
  return 'badge badge-danger';
}

export function PublisherGames() {
  const { token } = useAuth();
  const [games, setGames] = useState<Game[] | null>(null);
  const [merchantStatus, setMerchantStatus] = useState<PublisherStatusInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [platform, setPlatform] = useState('');
  const [screenshotUrlsInput, setScreenshotUrlsInput] = useState('');
  const [systemRequirements, setSystemRequirements] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    api
      .get<{ games: Game[] }>('/games/mine/all', token)
      .then((res) => setGames(res.games))
      .catch(() => setError('Could not load your games.'));
  }

  useEffect(refresh, [token]);

  useEffect(() => {
    api
      .get<{ publisher: PublisherStatusInfo }>('/auth/me/publisher', token)
      .then((res) => setMerchantStatus(res.publisher))
      .catch(() => {});
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const priceMinorUnits = Math.round(Number(price) * 100);
    if (!title || !description || !priceMinorUnits || priceMinorUnits <= 0) {
      setFormError('Fill in a title, description, and a price greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      const screenshotUrls = screenshotUrlsInput
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);
      await api.post(
        '/games',
        {
          title,
          description,
          price: priceMinorUnits,
          currency,
          coverImageUrl: coverImageUrl || undefined,
          genre: genre || undefined,
          platform: platform || undefined,
          screenshotUrls,
          systemRequirements: systemRequirements || undefined,
        },
        token
      );
      setTitle('');
      setDescription('');
      setPrice('');
      setCoverImageUrl('');
      setGenre('');
      setPlatform('');
      setScreenshotUrlsInput('');
      setSystemRequirements('');
      setFormOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(game: Game) {
    const nextStatus = game.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await api.patch(`/games/${game.id}`, { status: nextStatus }, token);
      refresh();
    } catch {
      setError(`Could not update "${game.title}".`);
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
        <h1>Manage products</h1>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? 'Cancel' : 'Add game'}
        </button>
      </div>

      {merchantStatus && (
        <div className="panel-card" style={{ marginBottom: 'var(--sp-8)' }}>
          {merchantStatus.surfboardMerchantId ? (
            <>
              <span style={{ fontSize: 15, color: 'var(--steam-400)' }}>Surfboard merchant ID</span>
              <div className="mono" style={{ fontSize: 16 }}>{merchantStatus.surfboardMerchantId}</div>
            </>
          ) : merchantStatus.surfboardApplicationId ? (
            <>
              <span style={{ fontSize: 15, color: 'var(--steam-400)' }}>
                Surfboard onboarding in progress — application {merchantStatus.surfboardApplicationId}
              </span>
              {merchantStatus.webKybUrl && (
                <div>
                  <a href={merchantStatus.webKybUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ember)' }}>
                    Complete KYB verification →
                  </a>
                </div>
              )}
            </>
          ) : (
            <span style={{ fontSize: 15, color: 'var(--danger)' }}>
              No Surfboard merchant application on file — your sales use the shared demo merchant for now.
            </span>
          )}
        </div>
      )}

      {formOpen && (
        <form onSubmit={onCreate} className="panel-card stack" style={{ gap: 'var(--sp-4)', marginBottom: 'var(--sp-8)' }}>
          {formError && <div className="form-error-banner">{formError}</div>}
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row" style={{ gap: 'var(--sp-4)' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="price">Price</label>
              <input
                id="price"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <span className="hint">Stored as integer minor units — you enter the display amount.</span>
            </div>
            <div className="field" style={{ width: 120 }}>
              <label htmlFor="currency">Currency</label>
              <input id="currency" required value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="coverImageUrl">Cover image URL</label>
            <input
              id="coverImageUrl"
              type="url"
              placeholder="https://…"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
            />
            <span className="hint">Optional — shown on the storefront and game page. Leave blank for a placeholder.</span>
          </div>
          <div className="row" style={{ gap: 'var(--sp-4)' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="genre">Genre</label>
              <input id="genre" placeholder="Roguelike" value={genre} onChange={(e) => setGenre(e.target.value)} />
              <span className="hint">Optional — powers the storefront's Categories filter.</span>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="platform">Platform</label>
              <input id="platform" placeholder="PC" value={platform} onChange={(e) => setPlatform(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="screenshotUrls">Screenshot URLs</label>
            <input
              id="screenshotUrls"
              placeholder="https://…, https://…, https://…"
              value={screenshotUrlsInput}
              onChange={(e) => setScreenshotUrlsInput(e.target.value)}
            />
            <span className="hint">Optional, comma-separated — shown as a gallery on the game page.</span>
          </div>
          <div className="field">
            <label htmlFor="systemRequirements">System requirements</label>
            <textarea
              id="systemRequirements"
              placeholder="OS: Windows 10&#10;CPU: ...&#10;RAM: 8 GB"
              value={systemRequirements}
              onChange={(e) => setSystemRequirements(e.target.value)}
            />
            <span className="hint">Optional — shown on the game page.</span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Creating…' : 'Create game (as draft)'}
          </button>
        </form>
      )}

      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}
      {!error && !games && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {games && games.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No games yet — add your first one above.</p>}

      {games && games.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {games.map((game) => (
            <div key={game.id} className="panel-card row" style={{ justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
              <div className="row" style={{ gap: 'var(--sp-4)' }}>
                <div
                  className="cover"
                  style={{
                    width: 72,
                    height: 40,
                    borderRadius: 'var(--r-sm)',
                    flexShrink: 0,
                    backgroundImage: game.coverImageUrl ? `url(${game.coverImageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{game.title}</span>
                  <span className="mono" style={{ fontSize: 15, color: 'var(--steam-400)' }}>
                    {formatMoney(game.price, game.currency)}
                  </span>
                </div>
              </div>
              <div className="row" style={{ gap: 'var(--sp-4)' }}>
                <span className={statusBadgeClass(game.status)}>{game.status}</span>
                {game.status !== 'DELISTED' && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleStatus(game)}>
                    {game.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
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
