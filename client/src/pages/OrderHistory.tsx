import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Order } from '../lib/types';

function statusBadgeClass(status: Order['status']) {
  if (status === 'PAID') return 'bg-success/15 text-success';
  if (status === 'REFUNDED') return 'bg-info/15 text-info';
  if (status === 'FAILED') return 'bg-danger/15 text-danger';
  return 'bg-warning/15 text-warning';
}

export function OrderHistory() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);

  function refresh() {
    api
      .get<{ orders: Order[] }>('/checkout', token)
      .then((res) => setOrders(res.orders))
      .catch(() => setError('Could not load order history.'));
  }

  useEffect(refresh, [token]);

  async function viewReceipt(orderId: string) {
    setReceiptLoadingId(orderId);
    setError(null);
    try {
      const res = await api.get<{ receiptUrl: string }>(`/checkout/${orderId}/receipt-link`, token);
      window.open(res.receiptUrl, '_blank', 'noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not fetch the receipt right now.');
    } finally {
      setReceiptLoadingId(null);
    }
  }

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
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-8 font-display text-2xl font-bold text-steam-100">Purchase history</h1>
      {error && <div className="mb-6 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
      {!error && !orders && <p className="text-steam-400">Loading…</p>}
      {orders && orders.length === 0 && <p className="text-steam-400">No orders yet.</p>}

      {orders && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const existingRefund = order.refunds[0];
            return (
              <div key={order.id} className="rounded-2xl border border-iron-700 bg-iron-900 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-steam-400">{new Date(order.createdAt).toLocaleString()}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="mb-3 space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-steam-100">{item.game.title}</span>
                      <span className="font-mono text-steam-400">{formatMoney(item.priceAtPurchase, order.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-iron-700 pt-3">
                  <span className="font-mono font-semibold text-steam-100">
                    Total: {formatMoney(order.totalAmount, order.currency)}
                  </span>

                  <div className="flex items-center gap-4">
                    {order.status === 'PAID' && (
                      <button
                        type="button"
                        disabled={receiptLoadingId === order.id}
                        onClick={() => viewReceipt(order.id)}
                        className="text-sm font-medium text-steam-400 hover:text-steam-100 disabled:opacity-50"
                      >
                        {receiptLoadingId === order.id ? 'Loading…' : 'View receipt'}
                      </button>
                    )}
                    {order.status === 'PAID' && !existingRefund && refundingOrderId !== order.id && (
                      <button
                        type="button"
                        onClick={() => setRefundingOrderId(order.id)}
                        className="text-sm font-medium text-steam-400 hover:text-steam-100"
                      >
                        Request refund
                      </button>
                    )}
                  </div>
                  {existingRefund && (
                    <span className="rounded-full bg-info/15 px-2.5 py-1 text-xs font-semibold text-info">
                      Refund {existingRefund.status.toLowerCase()}
                    </span>
                  )}
                </div>

                {refundingOrderId === order.id && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label htmlFor={`reason-${order.id}`} className="mb-1 block text-xs font-medium text-steam-400">
                        Reason
                      </label>
                      <input
                        id={`reason-${order.id}`}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why are you requesting a refund?"
                        className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none placeholder:text-steam-600 focus:border-ember"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => submitRefund(order.id)}
                        className="rounded-md bg-ember px-4 py-2 text-sm font-semibold text-iron-900 hover:bg-[#ff6a43] disabled:opacity-50"
                      >
                        {submitting ? 'Submitting…' : 'Submit request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRefundingOrderId(null);
                          setReason('');
                        }}
                        className="rounded-md px-4 py-2 text-sm text-steam-400 hover:bg-iron-800"
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
