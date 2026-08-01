import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Subscription } from '../lib/types';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_MS = 60_000;

export function SubscriptionConfirmation() {
  const { token } = useAuth();
  const [status, setStatus] = useState<Subscription['status'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await api.get<{ subscription: Subscription | null }>('/subscriptions/mine', token);
        if (cancelled) return;
        setStatus(res.subscription?.status ?? null);
        if (res.subscription?.status === 'PENDING_ACTIVATION' && elapsedRef.current < MAX_POLL_MS) {
          elapsedRef.current += POLL_INTERVAL_MS;
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError('Could not check subscription status.');
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-iron-700 bg-iron-900 p-8 text-center">
        {error && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        {!error && (status === null || status === 'PENDING_ACTIVATION') && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-iron-700 border-t-ember" />
            <h2 className="font-display text-xl font-semibold text-steam-100">Confirming your subscription…</h2>
            <p className="mt-2 text-steam-400">This usually only takes a few seconds.</p>
          </>
        )}

        {!error && status === 'ACTIVE' && (
          <>
            <span className="mb-4 inline-flex rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              GameForge+ active
            </span>
            <h2 className="font-display text-xl font-semibold text-steam-100">Welcome to GameForge+</h2>
            <p className="mb-6 mt-2 text-steam-400">Your 10% discount now applies at every checkout.</p>
            <div className="flex justify-center gap-3">
              <Link to="/" className="rounded-md bg-ember px-5 py-2.5 font-semibold text-iron-900 hover:bg-[#ff6a43]">
                Storefront
              </Link>
              <Link to="/profile" className="rounded-md border border-iron-700 px-5 py-2.5 text-steam-100 hover:bg-iron-800">
                Manage subscription
              </Link>
            </div>
          </>
        )}

        {!error && status !== null && status !== 'ACTIVE' && status !== 'PENDING_ACTIVATION' && (
          <>
            <span className="mb-4 inline-flex rounded-full bg-danger/15 px-3 py-1 text-xs font-semibold text-danger">
              Not completed
            </span>
            <h2 className="font-display text-xl font-semibold text-steam-100">Something went wrong</h2>
            <p className="mb-6 mt-2 text-steam-400">Your subscription wasn't activated. No charge should have gone through.</p>
            <Link to="/subscribe" className="rounded-md border border-iron-700 px-5 py-2.5 text-steam-100 hover:bg-iron-800">
              Try again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
