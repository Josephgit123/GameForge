import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { RefundQueueEntry } from '../lib/types';

export function AdminRefunds() {
  const { token } = useAuth();
  const [refunds, setRefunds] = useState<RefundQueueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function refresh() {
    api
      .get<{ refunds: RefundQueueEntry[] }>('/refunds', token)
      .then((res) => setRefunds(res.refunds))
      .catch(() => setError('Could not load refund requests.'));
  }

  useEffect(refresh, [token]);

  async function decide(id: string, action: 'APPROVE' | 'REJECT') {
    setActingId(id);
    setError(null);
    try {
      await api.patch(`/refunds/${id}`, { action }, token);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not process this refund.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Refund requests</h1>
      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}
      {!error && !refunds && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {refunds && refunds.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No pending refund requests.</p>}

      {refunds && refunds.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-4)' }}>
          {refunds.map((refund) => (
            <div key={refund.id} className="panel-card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                <span className="mono" style={{ fontSize: 15, color: 'var(--steam-400)' }}>
                  {refund.order.customer.email}
                </span>
                <span className="badge badge-warning">{refund.status}</span>
              </div>
              <div className="stack" style={{ gap: 'var(--sp-1)', marginBottom: 'var(--sp-3)' }}>
                {refund.order.items.map((item) => (
                  <span key={item.id} style={{ fontSize: 16 }}>
                    {item.game.title}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 15, color: 'var(--steam-400)', marginBottom: 'var(--sp-3)' }}>
                Reason: {refund.reason}
              </p>
              <div
                className="row"
                style={{ justifyContent: 'space-between', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--iron-700)' }}
              >
                <span className="mono" style={{ fontWeight: 600 }}>
                  {formatMoney(refund.amount, refund.order.currency)}
                </span>
                <div className="row" style={{ gap: 'var(--sp-3)' }}>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={actingId === refund.id}
                    onClick={() => decide(refund.id, 'REJECT')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={actingId === refund.id}
                    onClick={() => decide(refund.id, 'APPROVE')}
                  >
                    {actingId === refund.id ? 'Processing…' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
