import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import { GamePoster } from '../components/GamePoster';
import { hasRealCoverImage } from '../lib/posterArt';
import type { LibraryEntry } from '../lib/types';

type InstallState = 'idle' | 'installing' | 'installed';

function LibraryGrid({
  entries,
  installState,
  onInstall,
}: {
  entries: LibraryEntry[];
  installState: Record<string, InstallState>;
  onInstall: (entryId: string) => void;
}) {
  return (
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
            <div className="relative aspect-[3/4] bg-iron-800">
              {hasRealCoverImage(entry.game.coverImageUrl) ? (
                <img src={entry.game.coverImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <GamePoster title={entry.game.title} genre={entry.game.genre} seed={entry.gameId} showText={false} />
              )}
              {entry.game.earlyAccess && (
                <span className="absolute left-2 top-2 rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold text-gold-text-on">
                  EARLY ACCESS
                </span>
              )}
              {entry.game.beta && !entry.game.earlyAccess && (
                <span className="absolute left-2 top-2 rounded-md bg-info/90 px-2 py-0.5 text-[10px] font-bold text-iron-900">
                  BETA
                </span>
              )}
              {entry.game.gameForgePlusExclusive && !entry.game.earlyAccess && !entry.game.beta && (
                <span className="absolute left-2 top-2 rounded-md bg-violet/90 px-2 py-0.5 text-[10px] font-bold text-iron-900">
                  EXCLUSIVE
                </span>
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
                onClick={() => onInstall(entry.id)}
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
  );
}

export function MyGames() {
  const { token } = useAuth();
  const { isActiveMember } = useSubscription();
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

  // Presentational grouping of already-owned entries by the underlying
  // game's GameForge+ flags — no purchase logic touched, these are all
  // games the customer already owns.
  const earlyAccessEntries = (entries ?? []).filter((e) => e.game.earlyAccess);
  const betaEntries = (entries ?? []).filter((e) => e.game.beta && !e.game.earlyAccess);
  const exclusiveEntries = (entries ?? []).filter(
    (e) => e.game.gameForgePlusExclusive && !e.game.earlyAccess && !e.game.beta
  );
  const flaggedIds = new Set([...earlyAccessEntries, ...betaEntries, ...exclusiveEntries].map((e) => e.id));
  const restEntries = (entries ?? []).filter((e) => !flaggedIds.has(e.id));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-steam-100">My Library</h1>
        {isActiveMember && (
          <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
            ★ GameForge+ Member
          </span>
        )}
      </div>
      <p className="mb-8 text-sm text-steam-400">Installs are simulated for this demo — no files are actually downloaded.</p>

      {error && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
      {!error && !entries && <p className="text-steam-400">Loading…</p>}
      {entries && entries.length === 0 && (
        <p className="text-steam-400">You don't own any games yet — buy one from the storefront.</p>
      )}

      {earlyAccessEntries.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-gold">Early Access Games</h2>
          <LibraryGrid entries={earlyAccessEntries} installState={installState} onInstall={install} />
        </section>
      )}

      {betaEntries.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-info">Beta Access Games</h2>
          <LibraryGrid entries={betaEntries} installState={installState} onInstall={install} />
        </section>
      )}

      {exclusiveEntries.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-violet">Exclusive DLC &amp; Member-only Content</h2>
          <LibraryGrid entries={exclusiveEntries} installState={installState} onInstall={install} />
        </section>
      )}

      {restEntries.length > 0 && (
        <section>
          {(earlyAccessEntries.length > 0 || betaEntries.length > 0 || exclusiveEntries.length > 0) && (
            <h2 className="mb-3 font-display text-lg font-semibold text-steam-100">All Games</h2>
          )}
          <LibraryGrid entries={restEntries} installState={installState} onInstall={install} />
        </section>
      )}
    </div>
  );
}
