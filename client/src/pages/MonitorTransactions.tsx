import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { AdminTransaction } from '../lib/types';

function statusBadgeClass(status: AdminTransaction['status']) {
  if (status === 'PAID') return 'badge badge-success';
  if (status === 'PENDING') return 'badge badge-warning';
  return 'badge badge-danger';
}

export function MonitorTransactions() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<AdminTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ orders: AdminTransaction[] }>('/admin/transactions', token)
      .then((res) => setOrders(res.orders))
      .catch(() => setError('Could not load transactions.'));
  }, [token]);

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Monitor transactions</h1>
      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}
      {!error && !orders && <p style={{ color: 'var(--steam-400)' }}>Loading…</p>}
      {orders && orders.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No orders yet.</p>}

      {orders && orders.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {orders.map((order) => (
            <div key={order.id} className="panel-card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                  <span className="mono" style={{ fontSize: 15, color: 'var(--steam-400)' }}>{order.customer.email}</span>
                  <span className="mono" style={{ fontSize: 14, color: 'var(--steam-600)' }}>
                    {new Date(order.createdAt).toLocaleString()}
                    {order.surfboardOrderId && ` · ${order.surfboardOrderId}`}
                  </span>
                </div>
                <span className={statusBadgeClass(order.status)}>{order.status}</span>
              </div>
              <div className="stack" style={{ gap: 'var(--sp-1)', marginBottom: 'var(--sp-3)' }}>
                {order.items.map((item) => (
                  <span key={item.id} style={{ fontSize: 16 }}>
                    {item.game.title} — {formatMoney(item.priceAtPurchase, order.currency)}
                  </span>
                ))}
              </div>
              <div
                className="row"
                style={{ justifyContent: 'space-between', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--iron-700)' }}
              >
                <span className="mono" style={{ fontWeight: 600 }}>{formatMoney(order.totalAmount, order.currency)}</span>
                {order.refunds.length > 0 && (
                  <span className="badge badge-warning">
                    Refund {order.refunds[0].status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
