import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Subscription } from '../lib/types';

export function Profile() {
  const { user, token, logout } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'CUSTOMER') {
      setLoadingSub(false);
      return;
    }
    api
      .get<{ subscription: Subscription | null }>('/subscriptions/mine', token)
      .then((res) => setSubscription(res.subscription))
      .finally(() => setLoadingSub(false));
  }, [user, token]);

  async function onCancel() {
    setSubError(null);
    setCancelling(true);
    try {
      const res = await api.post<{ subscription: Subscription }>('/subscriptions/cancel', {}, token);
      setSubscription(res.subscription);
    } catch (err) {
      setSubError(err instanceof ApiError ? err.message : 'Could not cancel your subscription.');
    } finally {
      setCancelling(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-steam-100">Profile</h1>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-iron-700 bg-iron-900 p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-iron-800 font-display text-xl font-semibold text-steam-100">
          {user.firstName[0]}
          {user.lastName[0]}
        </div>
        <div>
          <div className="font-display text-lg font-semibold text-steam-100">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-sm text-steam-400">{user.email}</div>
          <div className="mt-1 inline-block rounded-full bg-iron-800 px-2 py-0.5 text-xs text-steam-400">
            {user.role}
          </div>
        </div>
      </div>

      {user.role === 'CUSTOMER' && !loadingSub && (
        <div className="mb-6 rounded-2xl border border-iron-700 bg-iron-900 p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-ember">GameForge+</span>
            {subscription && subscription.status !== 'CANCELLED' && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  subscription.status === 'ACTIVE'
                    ? 'bg-success/15 text-success'
                    : subscription.status === 'PAST_DUE'
                    ? 'bg-danger/15 text-danger'
                    : 'bg-iron-800 text-steam-400'
                }`}
              >
                {subscription.status}
              </span>
            )}
          </div>

          {(!subscription || subscription.status === 'CANCELLED') && (
            <>
              <p className="mb-4 text-sm text-steam-400">Get 10% off every purchase for {formatMoney(4900, 'SEK')}/month.</p>
              <Link to="/subscribe" className="inline-block rounded-md bg-ember px-4 py-2 text-sm font-semibold text-iron-900 hover:bg-[#ff6a43]">
                Subscribe
              </Link>
            </>
          )}

          {subscription?.status === 'PENDING_ACTIVATION' && (
            <p className="text-sm text-steam-400">Activating — this can take a few seconds after payment.</p>
          )}

          {subscription && (subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE') && (
            <>
              <p className="mb-1 text-sm text-steam-400">
                {formatMoney(subscription.amount, subscription.currency)}/month · {subscription.discountPercent}% off every purchase
              </p>
              {subscription.cardBrand && subscription.truncatedPan && (
                <p className="mb-1 text-sm text-steam-400">
                  {subscription.cardBrand} •••• {subscription.truncatedPan}
                </p>
              )}
              {subscription.currentPeriodEnd && (
                <p className="mb-4 text-sm text-steam-400">
                  Next renewal: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {subError && <div className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{subError}</div>}
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelling}
                className="rounded-md border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-iron-700 bg-iron-900 p-6">
        <div>
          <div className="font-medium text-steam-100">Appearance</div>
          <div className="text-sm text-steam-400">Switch between light and dark theme.</div>
        </div>
        <ThemeToggle />
      </div>

      <button
        type="button"
        onClick={logout}
        className="w-full rounded-md border border-danger/40 py-3 font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        Log out
      </button>
    </div>
  );
}
