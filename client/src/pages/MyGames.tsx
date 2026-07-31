import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import { GamePoster } from '../components/GamePoster';
import { hasRealCoverImage } from '../lib/posterArt';
import type { LibraryEntry } from '../lib/types';

type InstallState = 'idle' | 'installing' | 'installed';

export function MyGames() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installState, setInstallState] = useState<Record<string, InstallState>>({});

  useEffect(() => {
    api
      .get<{ entries: LibraryEntry[] }>('/library', token)
      .then((res) => setEntries(res.entries))
      .catch(() => setError('Could not load your games.'));
  }, [token]);

  function install(entryId: string) {
    setInstallState((s) => ({ ...s, [entryId]: 'installing' }));
    setTimeout(() => {
      setInstallState((s) => ({ ...s, [entryId]: 'installed' }));
    }, 1500);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-2 font-display text-2xl font-bold text-steam-100">My Library</h1>
      <p className="mb-8 text-sm text-steam-400">Installs are simulated for this demo — no files are actually downloaded.</p>

      {error && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
      {!error && !entries && <p className="text-steam-400">Loading…</p>}
      {entries && entries.length === 0 && (
        <p className="text-steam-400">You don't own any games yet — buy one from the storefront.</p>
      )}

      {entries && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((entry, i) => {
            const state = installState[entry.id] ?? 'idle';
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4) }}
                className="flex flex-col overflow-hidden rounded-lg border border-iron-700 bg-iron-900"
              >
                <div className="aspect-[3/4] bg-iron-800">
                  {hasRealCoverImage(entry.game.coverImageUrl) ? (
                    <img src={entry.game.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <GamePoster title={entry.game.title} genre={entry.game.genre} seed={entry.gameId} showText={false} />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <span className="truncate font-display text-sm font-semibold text-steam-100">{entry.game.title}</span>
                  <span className="font-mono text-xs text-steam-400">
                    {formatMoney(entry.game.price, entry.game.currency)}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={state === 'idle' ? { scale: 0.95 } : undefined}
                    disabled={state !== 'idle'}
                    onClick={() => install(entry.id)}
                    className={`mt-auto rounded-md py-2 text-sm font-semibold transition-colors disabled:opacity-70 ${
                      state === 'installed'
                        ? 'border border-iron-700 text-steam-100'
                        : 'bg-ember text-iron-900 hover:bg-[#ff6a43]'
                    }`}
                  >
                    {state === 'idle' && 'Install'}
                    {state === 'installing' && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-iron-900/30 border-t-iron-900" />
                        Installing…
                      </span>
                    )}
                    {state === 'installed' && '✓ Installed'}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
