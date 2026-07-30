import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
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
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-2)' }}>My games</h1>
      <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-8)', fontSize: 14 }}>
        Installs are simulated for this demo — no files are actually downloaded.
      </p>

      {error && <div className="form-error-banner">{error}</div>}
      {!error && !entries && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {entries && entries.length === 0 && (
        <p style={{ color: 'var(--steam-400)' }}>You don't own any games yet — buy one from the storefront.</p>
      )}

      {entries && entries.length > 0 && (
        <div className="grid-cards">
          {entries.map((entry) => {
            const state = installState[entry.id] ?? 'idle';
            return (
              <div key={entry.id} className="game-card">
                <div
                  className="cover"
                  style={
                    entry.game.coverImageUrl
                      ? {
                          backgroundImage: `url(${entry.game.coverImageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                />
                <div className="body">
                  <span className="title">{entry.game.title}</span>
                  <span className="price" style={{ marginBottom: 'var(--sp-3)' }}>
                    {formatMoney(entry.game.price, entry.game.currency)}
                  </span>
                  <button
                    type="button"
                    className={state === 'installed' ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                    disabled={state !== 'idle'}
                    onClick={() => install(entry.id)}
                  >
                    {state === 'idle' && 'Install'}
                    {state === 'installing' && 'Installing…'}
                    {state === 'installed' && 'Installed'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
