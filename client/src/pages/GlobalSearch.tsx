import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';

const TYPE_OPTIONS = ['', 'MERCHANT', 'STORE', 'TERMINAL', 'APPLICATION'];

// Confirmed live shape (Surfboard's own doc only said "the search results"):
// { hits: [{ data: {...fields, type}, matches: [{ field, matched, snippet }] }] }.
// `snippet` is pre-highlighted HTML from Surfboard — deliberately not
// rendered here (dangerouslySetInnerHTML) even though this is admin-only;
// `matched` gives the same information without taking on an HTML-injection
// surface for zero benefit.
interface SearchMatch {
  field: string;
  matched: string[];
}
interface SearchHit {
  data: Record<string, unknown> & { type?: string; name?: string };
  matches: SearchMatch[];
}

function pickId(data: SearchHit['data']): string | undefined {
  return (data.merchantId ?? data.storeId ?? data.applicationId ?? data.terminalId) as string | undefined;
}
function pickStatus(data: SearchHit['data']): string | undefined {
  return (data.merchantType ?? data.storeStatus ?? data.applicationStatus ?? data.terminalStatus ?? data.status) as
    | string
    | undefined;
}

function groupByType(hits: SearchHit[]): [string, SearchHit[]][] {
  const groups = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const key = hit.data.type ?? 'OTHER';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(hit);
  }
  return Array.from(groups.entries());
}

export function GlobalSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [storeStatus, setStoreStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setHits(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ query });
      if (type) params.set('type', type);
      if (storeStatus) params.set('storeStatus', storeStatus);
      const res = await api.get<{ data: { hits: SearchHit[] } }>(`/admin/search?${params.toString()}`, token);
      setHits(res.data.hits ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Global search</h1>
      <p style={{ marginBottom: 'var(--sp-6)', color: 'var(--steam-400)' }}>
        Free-text search across every merchant, store, terminal, and application on the partner account.
      </p>

      <form onSubmit={onSearch} className="row" style={{ gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
        <input
          type="text"
          required
          placeholder="Merchant, store, or company name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: 220 }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="input"
          style={{ width: 160, backgroundColor: 'var(--iron-800)', color: 'var(--steam-100)' }}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t} style={{ backgroundColor: 'var(--iron-800)', color: 'var(--steam-100)' }}>
              {t || 'All types'}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="storeStatus (e.g. ACTIVE)"
          value={storeStatus}
          onChange={(e) => setStoreStatus(e.target.value)}
          className="input"
          style={{ width: 180 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}

      {hits && hits.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No matches.</p>}

      {hits && hits.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-6)' }}>
          {groupByType(hits).map(([groupType, groupHits]) => (
            <div key={groupType}>
              <h2 style={{ marginBottom: 'var(--sp-3)', fontSize: 16, color: 'var(--steam-400)' }}>
                {groupType} <span style={{ color: 'var(--steam-600)' }}>({groupHits.length})</span>
              </h2>
              <div className="stack" style={{ gap: 'var(--sp-2)' }}>
                {groupHits.map((hit, i) => {
                  const id = pickId(hit.data);
                  const status = pickStatus(hit.data);
                  return (
                    <div key={id ?? i} className="panel-card">
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-1)' }}>
                        <strong>{hit.data.name ?? id ?? 'Untitled record'}</strong>
                        {status && <span className="badge">{status}</span>}
                      </div>
                      {id && <div className="mono" style={{ fontSize: 13, color: 'var(--steam-400)' }}>{id}</div>}
                      {hit.matches.length > 0 && (
                        <div style={{ marginTop: 'var(--sp-2)', fontSize: 13, color: 'var(--steam-600)' }}>
                          Matched: {hit.matches.map((m) => `${m.field} ("${m.matched.join(', ')}")`).join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
