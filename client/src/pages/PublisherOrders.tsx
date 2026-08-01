import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import { Pagination } from '../components/Pagination';
import { EmptyPlaceholder } from '../components/EmptyPlaceholder';
import { SkeletonLoader } from '../components/SkeletonLoader';
import type { Order, RefundQueueEntry } from '../lib/types';

const PAGE_SIZE = 8;

function orderStatusClass(status: Order['status']) {
  if (status === 'PAID') return 'bg-success/15 text-success';
  if (status === 'REFUNDED') return 'bg-info/15 text-info';
  if (status === 'FAILED') return 'bg-danger/15 text-danger';
  return 'bg-warning/15 text-warning';
}

function refundStatusClass(status: string) {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'bg-success/15 text-success';
  if (status === 'REJECTED') return 'bg-danger/15 text-danger';
  return 'bg-warning/15 text-warning';
}

export function PublisherOrders() {
  const { token } = useAuth();
  const [refunds, setRefunds] = useState<RefundQueueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  function refresh() {
    api
      .get<{ refunds: RefundQueueEntry[] }>('/refunds', token)
      .then((res) => setRefunds(res.refunds))
      .catch(() => setError('Could not load orders.'));
  }

  useEffect(refresh, [token]);

  async function decide(id: string, action: 'APPROVE' | 'REJECT') {
    setActingId(id);
    setError(null);
    try {
      await api.patch(`/refunds/${id}`, { action }, token);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not process this order.');
    } finally {
      setActingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!refunds) return [];
    if (!search.trim()) return refunds;
    const q = search.trim().toLowerCase();
    return refunds.filter(
      (r) =>
        r.order.id.toLowerCase().includes(q) ||
        r.order.customer.email.toLowerCase().includes(q) ||
        r.order.items.some((i) => i.game.title.toLowerCase().includes(q))
    );
  }, [refunds, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-bold text-steam-100">Orders</h1>
        <p className="mt-1 text-sm text-steam-400">
          {refunds ? `${refunds.length} order${refunds.length === 1 ? '' : 's'} awaiting a refund decision` : 'Loading…'}
        </p>
      </div>
      <p className="mb-6 text-xs text-steam-600">
        Scoped to orders with open refund requests — a full order history isn't exposed to publishers by the current API.
        Once you approve or reject an order here, it moves out of this queue.
      </p>

      <div className="mb-6 flex max-w-md items-center gap-2 rounded-full border border-iron-700 bg-iron-900 px-4 py-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="shrink-0 text-steam-400">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          placeholder="Search by order ID, customer, or game…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full bg-transparent text-sm text-steam-100 outline-none placeholder:text-steam-600"
        />
      </div>

      {error && <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {!error && !refunds && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {refunds && refunds.length === 0 && (
        <EmptyPlaceholder title="No orders need attention" description="Orders with a refund request will show up here." />
      )}

      {refunds && refunds.length > 0 && filtered.length === 0 && (
        <EmptyPlaceholder title="No orders match your search" />
      )}

      {pageItems.length > 0 && (
        <div className="space-y-4">
          {pageItems.map((refund) => (
            <div key={refund.id} className="rounded-2xl border border-iron-700 bg-iron-900 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-steam-600">Order {refund.order.id.slice(0, 8)}</span>
                  <div className="text-sm text-steam-100">{refund.order.customer.email}</div>
                </div>
                <div className="flex gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClass(refund.order.status)}`}>
                    {refund.order.status}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${refundStatusClass(refund.status)}`}>
                    Refund {refund.status}
                  </span>
                </div>
              </div>

              <div className="mb-3 space-y-1">
                {refund.order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-steam-100">{item.game.title}</span>
                    <span className="font-mono text-steam-400">{formatMoney(item.priceAtPurchase, refund.order.currency)}</span>
                  </div>
                ))}
              </div>

              <p className="mb-3 text-sm text-steam-400">Reason: {refund.reason}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-iron-700 pt-3">
                <div className="flex flex-wrap items-center gap-4 text-xs text-steam-600">
                  <span>Purchased {new Date(refund.order.createdAt).toLocaleDateString()}</span>
                  <span className="font-mono">
                    Merchant: {refund.order.surfboardMerchantId ? refund.order.surfboardMerchantId.slice(0, 12) : 'Shared demo'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-steam-100">{formatMoney(refund.amount, refund.order.currency)}</span>
                  <button
                    type="button"
                    disabled={actingId === refund.id}
                    onClick={() => decide(refund.id, 'REJECT')}
                    className="rounded-md border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={actingId === refund.id}
                    onClick={() => decide(refund.id, 'APPROVE')}
                    className="rounded-md bg-ember px-3 py-1.5 text-xs font-semibold text-iron-900 hover:bg-[#ff6a43] disabled:opacity-50"
                  >
                    {actingId === refund.id ? 'Processing…' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
