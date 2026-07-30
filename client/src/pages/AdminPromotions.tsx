import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import type { Promotion, PromotionType } from '../lib/types';

export function AdminPromotions() {
  const { token } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [type, setType] = useState<PromotionType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    api
      .get<{ promotions: Promotion[] }>('/promotions', token)
      .then((res) => setPromotions(res.promotions))
      .catch(() => setError('Could not load promotions.'));
  }

  useEffect(refresh, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const numericValue = type === 'PERCENTAGE' ? Number(value) : Math.round(Number(value) * 100);
    if (!code || !numericValue || !startsAt || !endsAt || !usageLimit) {
      setError('Fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        '/promotions',
        {
          code: code.toUpperCase(),
          type,
          value: numericValue,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          usageLimit: Number(usageLimit),
        },
        token
      );
      setCode('');
      setValue('');
      setStartsAt('');
      setEndsAt('');
      setUsageLimit('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create promotion.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Promotions</h1>

      <form onSubmit={onCreate} className="panel-card stack" style={{ gap: 'var(--sp-4)', marginBottom: 'var(--sp-8)' }}>
        {error && <div className="form-error-banner">{error}</div>}
        <div className="row" style={{ gap: 'var(--sp-4)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="code">Code</label>
            <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER20" />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label htmlFor="type">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as PromotionType)}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </select>
          </div>
          <div className="field" style={{ width: 140 }}>
            <label htmlFor="value">{type === 'PERCENTAGE' ? 'Percent off' : 'Amount off'}</label>
            <input id="value" type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--sp-4)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="startsAt">Starts</label>
            <input id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="endsAt">Ends</label>
            <input id="endsAt" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label htmlFor="usageLimit">Usage limit</label>
            <input id="usageLimit" type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
          {submitting ? 'Creating…' : 'Create promotion'}
        </button>
      </form>

      {!error && !promotions && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {promotions && promotions.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No promotions yet.</p>}

      {promotions && promotions.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {promotions.map((promo) => (
            <div key={promo.id} className="panel-card row" style={{ justifyContent: 'space-between' }}>
              <span className="mono" style={{ fontWeight: 600 }}>{promo.code}</span>
              <span style={{ fontSize: 13, color: 'var(--steam-400)' }}>
                {promo.type === 'PERCENTAGE' ? `${promo.value}% off` : `${(promo.value / 100).toFixed(2)} off`}
              </span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--steam-400)' }}>
                {promo._count?.usages ?? 0} / {promo.usageLimit} used
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
