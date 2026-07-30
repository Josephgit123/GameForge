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
    <div className="page" style={{ maxWidth: 480 }}>
      <div className="panel-card">
        {error && <div className="form-error-banner">{error}</div>}

        {!error && status === null && <p style={{ color: 'var(--steam-400)' }}>Checking your order…</p>}

        {!error && status === 'PENDING' && (
          <>
            <h2>Confirming payment…</h2>
            <p style={{ color: 'var(--steam-400)', marginTop: 'var(--sp-2)' }}>
              This usually only takes a few seconds.
            </p>
          </>
        )}

        {!error && status === 'PAID' && (
          <>
            <span className="badge badge-success" style={{ marginBottom: 'var(--sp-4)' }}>
              Payment complete
            </span>
            <h2>You're all set</h2>
            <p style={{ color: 'var(--steam-400)', marginTop: 'var(--sp-2)', marginBottom: 'var(--sp-6)' }}>
              Your game has been added to your library.
            </p>
            <Link to="/" className="btn btn-primary">
              Back to storefront
            </Link>
          </>
        )}

        {!error && (status === 'FAILED' || status === 'REFUNDED') && (
          <>
            <span className="badge badge-danger" style={{ marginBottom: 'var(--sp-4)' }}>
              Payment not completed
            </span>
            <h2>Something went wrong</h2>
            <p style={{ color: 'var(--steam-400)', marginTop: 'var(--sp-2)', marginBottom: 'var(--sp-6)' }}>
              Your payment wasn't completed. No charge should have gone through.
            </p>
            <Link to="/" className="btn btn-secondary">
              Back to storefront
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
