import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { AdminSubscription } from '../lib/types';

function statusBadgeClass(status: AdminSubscription['status']) {
  if (status === 'ACTIVE') return 'badge badge-success';
  if (status === 'PAST_DUE') return 'badge badge-danger';
  if (status === 'PENDING_ACTIVATION') return 'badge badge-warning';
  return 'badge';
}

function chargeBadgeClass(status: 'PENDING' | 'PAID' | 'FAILED') {
  if (status === 'PAID') return 'badge badge-success';
  if (status === 'FAILED') return 'badge badge-danger';
  return 'badge badge-warning';
}

export function ManageSubscriptions() {
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function refresh() {
    api
      .get<{ subscriptions: AdminSubscription[] }>('/admin/subscriptions', token)
      .then((res) => setSubscriptions(res.subscriptions))
      .catch(() => setError('Could not load subscriptions.'));
  }

  useEffect(refresh, [token]);

  async function onProcessRenewals() {
    setError(null);
    setResult(null);
    setProcessing(true);
    try {
      const res = await api.post<{ processed: number; succeeded: number }>('/admin/subscriptions/process-renewals', {}, token);
      setResult(`Processed ${res.processed} due renewal${res.processed === 1 ? '' : 's'} — ${res.succeeded} succeeded.`);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not process renewals.');
    } finally {
      setProcessing(false);
    }
  }

  const active = (subscriptions ?? []).filter((s) => s.status === 'ACTIVE' || s.status === 'PAST_DUE');

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-8)' }}>
        <h1>Manage subscriptions</h1>
        <button type="button" className="btn btn-primary" onClick={onProcessRenewals} disabled={processing}>
          {processing ? 'Processing…' : 'Process due renewals'}
        </button>
      </div>

      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}
      {result && (
        <div className="panel-card" style={{ marginBottom: 'var(--sp-6)', color: 'var(--teal)' }}>
          {result}
        </div>
      )}

      <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-6)' }}>
        {active.length} active GameForge+ subscriber{active.length === 1 ? '' : 's'} · renewals only fire when you
        click above (no background job in this project) — a due subscription charges its saved token via a real
        Surfboard order + CTOKEN payment.
      </p>

      {!error && !subscriptions && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {subscriptions && subscriptions.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No subscribers yet.</p>}

      {subscriptions && subscriptions.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {subscriptions.map((sub) => (
            <div key={sub.id} className="panel-card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                  <span className="mono" style={{ fontSize: 15, color: 'var(--steam-400)' }}>{sub.customer.email}</span>
                  <span className="mono" style={{ fontSize: 14, color: 'var(--steam-600)' }}>
                    {formatMoney(sub.amount, sub.currency)}/mo · {sub.discountPercent}% off
                    {sub.cardBrand && sub.truncatedPan && ` · ${sub.cardBrand} •••• ${sub.truncatedPan}`}
                    {sub.currentPeriodEnd && ` · renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                  </span>
                </div>
                <span className={statusBadgeClass(sub.status)}>{sub.status}</span>
              </div>
              {sub.charges.length > 0 && (
                <div className="stack" style={{ gap: 'var(--sp-1)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--iron-700)' }}>
                  {sub.charges.map((charge) => (
                    <div key={charge.id} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontSize: 14, color: 'var(--steam-600)' }}>
                        {new Date(charge.createdAt).toLocaleString()}
                      </span>
                      <span className="mono" style={{ fontSize: 14 }}>{formatMoney(charge.amount, charge.currency)}</span>
                      <span className={chargeBadgeClass(charge.status)}>{charge.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
