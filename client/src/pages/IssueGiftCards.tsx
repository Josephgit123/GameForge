import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { GiftCard } from '../lib/types';

export function IssueGiftCards() {
  const { token } = useAuth();
  const [giftCards, setGiftCards] = useState<GiftCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SEK');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    api
      .get<{ giftCards: GiftCard[] }>('/gift-cards', token)
      .then((res) => setGiftCards(res.giftCards))
      .catch(() => setError('Could not load gift cards.'));
  }

  useEffect(refresh, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const minorUnits = Math.round(Number(amount) * 100);
    if (!minorUnits || minorUnits <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/gift-cards', { amount: minorUnits, currency, name: name || undefined }, token);
      setAmount('');
      setName('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not issue gift card.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Issue gift cards</h1>

      <form onSubmit={onCreate} className="panel-card stack" style={{ gap: 'var(--sp-4)', marginBottom: 'var(--sp-8)' }}>
        {error && <div className="form-error-banner">{error}</div>}
        <div className="row" style={{ gap: 'var(--sp-4)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="amount">Amount</label>
            <input id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field" style={{ width: 100 }}>
            <label htmlFor="currency">Currency</label>
            <input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="name">Name (optional)</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Holiday Gift Card" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
          {submitting ? 'Issuing…' : 'Issue gift card'}
        </button>
      </form>

      {!error && !giftCards && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {giftCards && giftCards.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No gift cards issued yet.</p>}

      {giftCards && giftCards.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {giftCards.map((gc) => (
            <div key={gc.id} className="panel-card row" style={{ justifyContent: 'space-between' }}>
              <span className="mono">{gc.code}</span>
              <span className="mono" style={{ color: 'var(--steam-400)' }}>
                {formatMoney(gc.currentBalance, 'SEK')} / {formatMoney(gc.initialBalance, 'SEK')}
              </span>
              <span className={gc.status === 'ACTIVE' ? 'badge badge-success' : 'badge badge-warning'}>{gc.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
