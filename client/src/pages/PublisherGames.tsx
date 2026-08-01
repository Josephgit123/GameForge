import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { Modal } from '../components/Modal';
import { PublisherGameCard } from '../components/PublisherGameCard';
import { EmptyPlaceholder } from '../components/EmptyPlaceholder';
import { SkeletonLoader } from '../components/SkeletonLoader';
import type { Game, PublisherGameRevenue } from '../lib/types';

interface GameFormValues {
  title: string;
  description: string;
  price: string;
  currency: string;
  coverImageUrl: string;
  genre: string;
  platform: string;
  screenshotUrlsInput: string;
  systemRequirements: string;
}

const EMPTY_FORM: GameFormValues = {
  title: '',
  description: '',
  price: '',
  currency: 'USD',
  coverImageUrl: '',
  genre: '',
  platform: '',
  screenshotUrlsInput: '',
  systemRequirements: '',
};

function gameToForm(game: Game): GameFormValues {
  return {
    title: game.title,
    description: game.description,
    price: (game.price / 100).toString(),
    currency: game.currency,
    coverImageUrl: game.coverImageUrl ?? '',
    genre: game.genre ?? '',
    platform: game.platform ?? '',
    screenshotUrlsInput: game.screenshotUrls.join(', '),
    systemRequirements: game.systemRequirements ?? '',
  };
}

function GameFormFields({ values, onChange }: { values: GameFormValues; onChange: (field: keyof GameFormValues, value: string) => void }) {
  const inputClass =
    'w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none placeholder:text-steam-600 focus:border-ember';
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-steam-400">Title</label>
        <input required value={values.title} onChange={(e) => onChange('title', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-steam-400">Description</label>
        <textarea
          required
          rows={3}
          value={values.description}
          onChange={(e) => onChange('description', e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-steam-400">Price</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={values.price}
            onChange={(e) => onChange('price', e.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-steam-600">Stored as integer minor units — enter the display amount.</span>
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-steam-400">Currency</label>
          <input
            required
            value={values.currency}
            onChange={(e) => onChange('currency', e.target.value.toUpperCase())}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-steam-400">Cover image URL</label>
        <input
          type="url"
          placeholder="https://…"
          value={values.coverImageUrl}
          onChange={(e) => onChange('coverImageUrl', e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-steam-400">Genre</label>
          <input placeholder="Roguelike" value={values.genre} onChange={(e) => onChange('genre', e.target.value)} className={inputClass} />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-steam-400">Platform</label>
          <input placeholder="PC" value={values.platform} onChange={(e) => onChange('platform', e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-steam-400">Screenshot URLs</label>
        <input
          placeholder="https://…, https://…"
          value={values.screenshotUrlsInput}
          onChange={(e) => onChange('screenshotUrlsInput', e.target.value)}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-steam-600">Optional, comma-separated.</span>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-steam-400">System requirements</label>
        <textarea
          rows={3}
          placeholder="OS: Windows 10&#10;CPU: ...&#10;RAM: 8 GB"
          value={values.systemRequirements}
          onChange={(e) => onChange('systemRequirements', e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function formToPayload(values: GameFormValues) {
  return {
    title: values.title,
    description: values.description,
    price: Math.round(Number(values.price) * 100),
    currency: values.currency,
    coverImageUrl: values.coverImageUrl || undefined,
    genre: values.genre || undefined,
    platform: values.platform || undefined,
    screenshotUrls: values.screenshotUrlsInput
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean),
    systemRequirements: values.systemRequirements || undefined,
  };
}

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT' | 'DELISTED';
type SortKey = 'title' | 'price-desc' | 'price-asc' | 'newest';

export function PublisherGames() {
  const { token } = useAuth();
  const location = useLocation();
  const [games, setGames] = useState<Game[] | null>(null);
  const [byGame, setByGame] = useState<PublisherGameRevenue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');

  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<GameFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editValues, setEditValues] = useState<GameFormValues>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  function refresh() {
    api
      .get<{ games: Game[] }>('/games/mine/all', token)
      .then((res) => setGames(res.games))
      .catch(() => setError('Could not load your games.'));
  }

  useEffect(refresh, [token]);

  useEffect(() => {
    api
      .get<{ games: PublisherGameRevenue[] }>('/analytics/publisher/by-game', token)
      .then((res) => setByGame(res.games))
      .catch(() => {});
  }, [token]);

  // Dashboard's "Upload new game" quick action links here with this state.
  useEffect(() => {
    if ((location.state as { openForm?: boolean } | null)?.openForm) {
      setFormOpen(true);
    }
  }, [location.state]);

  const topSellerId = byGame && byGame.length > 0 ? byGame[0].gameId : null;

  const genres = useMemo(() => {
    const set = new Set((games ?? []).map((g) => g.genre).filter((g): g is string => Boolean(g)));
    return Array.from(set).sort();
  }, [games]);

  const filteredGames = useMemo(() => {
    let list = games ?? [];
    if (statusFilter !== 'ALL') list = list.filter((g) => g.status === statusFilter);
    if (genreFilter) list = list.filter((g) => g.genre === genreFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [games, statusFilter, genreFilter, search, sort]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = formToPayload(formValues);
    if (!payload.title || !payload.description || !payload.price || payload.price <= 0) {
      setFormError('Fill in a title, description, and a price greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/games', payload, token);
      setFormValues(EMPTY_FORM);
      setFormOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(game: Game) {
    setEditingGame(game);
    setEditValues(gameToForm(game));
    setEditError(null);
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingGame) return;
    setEditError(null);
    const payload = formToPayload(editValues);
    if (!payload.title || !payload.description || !payload.price || payload.price <= 0) {
      setEditError('Fill in a title, description, and a price greater than 0.');
      return;
    }
    setEditSubmitting(true);
    try {
      await api.patch(`/games/${editingGame.id}`, payload, token);
      setEditingGame(null);
      refresh();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setEditSubmitting(false);
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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-steam-100">My Games</h1>
          <p className="mt-1 text-sm text-steam-400">{games ? `${games.length} game${games.length === 1 ? '' : 's'}` : 'Loading…'}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-md bg-ember px-4 py-2 text-sm font-semibold text-iron-900 hover:bg-[#ff6a43]"
        >
          {formOpen ? 'Cancel' : 'Add game'}
        </motion.button>
      </div>

      {formOpen && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={onCreate}
          className="mb-8 rounded-2xl border border-iron-700 bg-iron-900 p-5"
        >
          {formError && <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</div>}
          <GameFormFields values={formValues} onChange={(field, value) => setFormValues((v) => ({ ...v, [field]: value }))} />
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-md bg-ember px-4 py-2 text-sm font-semibold text-iron-900 hover:bg-[#ff6a43] disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create game (as draft)'}
          </button>
        </motion.form>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-iron-700 bg-iron-900 px-4 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="shrink-0 text-steam-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Search your games…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-steam-100 outline-none placeholder:text-steam-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-iron-700 bg-iron-900 px-3 py-2 text-sm text-steam-100"
        >
          <option value="ALL">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="DELISTED">Delisted</option>
        </select>

        {genres.length > 0 && (
          <select
            value={genreFilter ?? ''}
            onChange={(e) => setGenreFilter(e.target.value || null)}
            className="rounded-md border border-iron-700 bg-iron-900 px-3 py-2 text-sm text-steam-100"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md border border-iron-700 bg-iron-900 px-3 py-2 text-sm text-steam-100"
        >
          <option value="newest">Newest first</option>
          <option value="title">Title (A–Z)</option>
          <option value="price-desc">Price (high–low)</option>
          <option value="price-asc">Price (low–high)</option>
        </select>

        <div className="flex overflow-hidden rounded-md border border-iron-700">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`px-3 py-2 text-sm ${view === 'grid' ? 'bg-ember text-iron-900' : 'bg-iron-900 text-steam-400'}`}
            aria-label="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="3" width="7" height="7" /> <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /> <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-ember text-iron-900' : 'bg-iron-900 text-steam-400'}`}
            aria-label="List view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {!error && !games && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      )}

      {games && games.length === 0 && (
        <EmptyPlaceholder title="No games yet" description="Add your first game to get started." />
      )}

      {games && games.length > 0 && filteredGames.length === 0 && (
        <EmptyPlaceholder title="No games match your filters" description="Try clearing the search or filters." />
      )}

      {filteredGames.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredGames.map((game) => (
            <PublisherGameCard
              key={game.id}
              game={game}
              isTopSeller={game.id === topSellerId}
              onEdit={() => openEdit(game)}
              onToggleStatus={() => toggleStatus(game)}
            />
          ))}
        </div>
      )}

      {filteredGames.length > 0 && view === 'list' && (
        <div className="flex flex-col gap-3">
          {filteredGames.map((game) => (
            <PublisherGameCard
              key={game.id}
              game={game}
              layout="list"
              isTopSeller={game.id === topSellerId}
              onEdit={() => openEdit(game)}
              onToggleStatus={() => toggleStatus(game)}
            />
          ))}
        </div>
      )}

      <Modal open={!!editingGame} onClose={() => setEditingGame(null)} title={`Edit ${editingGame?.title ?? ''}`}>
        <form onSubmit={onSaveEdit} className="max-h-[70vh] overflow-y-auto pr-1">
          {editError && <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{editError}</div>}
          <GameFormFields values={editValues} onChange={(field, value) => setEditValues((v) => ({ ...v, [field]: value }))} />
          <button
            type="submit"
            disabled={editSubmitting}
            className="mt-4 w-full rounded-md bg-ember py-2.5 text-sm font-semibold text-iron-900 hover:bg-[#ff6a43] disabled:opacity-50"
          >
            {editSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
