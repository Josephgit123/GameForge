import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Order } from '../lib/types';

function statusBadgeClass(status: Order['status']) {
  if (status === 'PAID') return 'badge badge-success';
  if (status === 'REFUNDED') return 'badge badge-info';
  if (status === 'FAILED') return 'badge badge-danger';
  return 'badge badge-warning';
}

export function OrderHistory() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    api
      .get<{ orders: Order[] }>('/checkout', token)
      .then((res) => setOrders(res.orders))
      .catch(() => setError('Could not load order history.'));
  }

  useEffect(refresh, [token]);

  async function submitRefund(orderId: string) {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/refunds', { orderId, reason }, token);
      setRefundingOrderId(null);
      setReason('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not request refund.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Order history</h1>
      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}
      {!error && !orders && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {orders && orders.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No orders yet.</p>}

      {orders && orders.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-4)' }}>
          {orders.map((order) => {
            const existingRefund = order.refunds[0];
            return (
              <div key={order.id} className="panel-card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--steam-400)' }}>
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                  <span className={statusBadgeClass(order.status)}>{order.status}</span>
                </div>
                <div className="stack" style={{ gap: 'var(--sp-1)', marginBottom: 'var(--sp-3)' }}>
                  {order.items.map((item) => (
                    <div key={item.id} className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
                      <span>{item.game.title}</span>
                      <span className="mono" style={{ color: 'var(--steam-400)' }}>
                        {formatMoney(item.priceAtPurchase, order.currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="row"
                  style={{ justifyContent: 'space-between', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--iron-700)' }}
                >
                  <span className="mono" style={{ fontWeight: 600 }}>
                    Total: {formatMoney(order.totalAmount, order.currency)}
                  </span>

                  {order.status === 'PAID' && !existingRefund && refundingOrderId !== order.id && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefundingOrderId(order.id)}>
                      Request refund
                    </button>
                  )}
                  {existingRefund && (
                    <span className={statusBadgeClass('REFUNDED')} style={{ fontSize: 11 }}>
                      Refund {existingRefund.status.toLowerCase()}
                    </span>
                  )}
                </div>

                {refundingOrderId === order.id && (
                  <div className="stack" style={{ gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                    <div className="field">
                      <label htmlFor={`reason-${order.id}`}>Reason</label>
                      <input
                        id={`reason-${order.id}`}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why are you requesting a refund?"
                      />
                    </div>
                    <div className="row" style={{ gap: 'var(--sp-3)' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={submitting}
                        onClick={() => submitRefund(order.id)}
                      >
                        {submitting ? 'Submitting…' : 'Submit request'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setRefundingOrderId(null);
                          setReason('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
