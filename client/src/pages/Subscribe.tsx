import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { Subscription } from '../lib/types';

export function Subscribe() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ subscription: Subscription | null }>('/subscriptions/mine', token)
      .then((res) => setSubscription(res.subscription))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubscribe() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ paymentPageLink: string }>('/subscriptions/start', {}, token);
      window.location.href = res.paymentPageLink;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start your subscription. Try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-steam-400">Loading…</div>;
  }

  if (subscription && subscription.status !== 'CANCELLED') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-4 font-display text-2xl font-bold text-steam-100">You're already a GameForge+ member</h1>
        <p className="mb-6 text-steam-400">Manage your subscription from your profile.</p>
        <Link to="/profile" className="rounded-md bg-ember px-5 py-2.5 font-semibold text-iron-900 hover:bg-[#ff6a43]">
          Go to profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-ember/40 bg-iron-900 p-8 text-center">
        <span className="mb-4 inline-flex rounded-full bg-ember/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ember">
          GameForge+
        </span>
        <h1 className="mb-3 font-display text-3xl font-bold text-steam-100">10% off every purchase</h1>
        <p className="mb-6 text-steam-400">
          One membership, every game — {formatMoney(4900, 'SEK')}/month, cancel anytime. Renews automatically using
          the card you subscribe with.
        </p>

        {error && <div className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onSubscribe}
          disabled={submitting}
          className="w-full rounded-md bg-ember py-3 font-semibold text-iron-900 transition-colors hover:bg-[#ff6a43] disabled:opacity-50"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-iron-900/30 border-t-iron-900" />
              Starting subscription…
            </span>
          ) : (
            `Subscribe — ${formatMoney(4900, 'SEK')}/month`
          )}
        </motion.button>
        <p className="mt-3 text-xs text-steam-600">
          Card entered on Surfboard's secure payment page. Renewal charges reuse a saved token — no need to re-enter
          your card each month.
        </p>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sm text-steam-400 hover:text-steam-100">
          Not now
        </button>
      </div>
    </div>
  );
}
