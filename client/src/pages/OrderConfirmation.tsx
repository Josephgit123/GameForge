import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type LocalOrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_MS = 60_000;

export function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const [status, setStatus] = useState<LocalOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await api.get<{ status: LocalOrderStatus }>(`/checkout/${orderId}/status`, token);
        if (cancelled) return;
        setStatus(res.status);
        if (res.status === 'PENDING' && elapsedRef.current < MAX_POLL_MS) {
          elapsedRef.current += POLL_INTERVAL_MS;
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError('Could not check order status.');
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-iron-700 bg-iron-900 p-8 text-center">
        {error && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        {!error && status === null && <p className="text-steam-400">Checking your order…</p>}

        {!error && status === 'PENDING' && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-iron-700 border-t-ember" />
            <h2 className="font-display text-xl font-semibold text-steam-100">Confirming payment…</h2>
            <p className="mt-2 text-steam-400">This usually only takes a few seconds.</p>
          </>
        )}

        {!error && status === 'PAID' && (
          <>
            <span className="mb-4 inline-flex rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              Payment complete
            </span>
            <h2 className="font-display text-xl font-semibold text-steam-100">You're all set</h2>
            <p className="mb-6 mt-2 text-steam-400">Your game has been added to your library.</p>
            <div className="flex justify-center gap-3">
              <Link to="/library" className="rounded-md bg-ember px-5 py-2.5 font-semibold text-iron-900 hover:bg-[#ff6a43]">
                Go to library
              </Link>
              <Link to="/" className="rounded-md border border-iron-700 px-5 py-2.5 text-steam-100 hover:bg-iron-800">
                Storefront
              </Link>
            </div>
          </>
        )}

        {!error && (status === 'FAILED' || status === 'REFUNDED') && (
          <>
            <span className="mb-4 inline-flex rounded-full bg-danger/15 px-3 py-1 text-xs font-semibold text-danger">
              Payment not completed
            </span>
            <h2 className="font-display text-xl font-semibold text-steam-100">Something went wrong</h2>
            <p className="mb-6 mt-2 text-steam-400">Your payment wasn't completed. No charge should have gone through.</p>
            <Link to="/" className="rounded-md border border-iron-700 px-5 py-2.5 text-steam-100 hover:bg-iron-800">
              Back to storefront
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
