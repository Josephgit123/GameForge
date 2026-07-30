import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { PublisherRevenue, SalesPoint } from '../lib/types';

export function AdminAnalytics() {
  const { token } = useAuth();
  const [sales, setSales] = useState<SalesPoint[] | null>(null);
  const [revenue, setRevenue] = useState<PublisherRevenue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ sales: SalesPoint[] }>('/analytics/sales', token),
      api.get<{ revenueByPublisher: PublisherRevenue[] }>('/analytics/revenue-by-publisher', token),
    ])
      .then(([salesRes, revenueRes]) => {
        setSales(salesRes.sales);
        setRevenue(revenueRes.revenueByPublisher);
      })
      .catch(() => setError('Could not load analytics.'));
  }, [token]);

  const maxRevenue = sales ? Math.max(...sales.map((s) => s.totalRevenue), 1) : 1;

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>Analytics</h1>
      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}

      <h2 style={{ marginBottom: 'var(--sp-4)' }}>Sales</h2>
      {sales && sales.length === 0 && <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-8)' }}>No completed sales yet.</p>}
      {sales && sales.length > 0 && (
        <div className="panel-card" style={{ marginBottom: 'var(--sp-8)' }}>
          <div className="stack" style={{ gap: 'var(--sp-3)' }}>
            {sales.map((point) => (
              <div key={point.date} className="row" style={{ gap: 'var(--sp-4)', alignItems: 'center' }}>
                <span className="mono" style={{ width: 100, fontSize: 12, color: 'var(--steam-400)' }}>
                  {point.date}
                </span>
                <div style={{ flex: 1, background: 'var(--iron-800)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(point.totalRevenue / maxRevenue) * 100}%`,
                      background: 'var(--ember)',
                      height: 20,
                      minWidth: 4,
                      borderRadius: 'var(--r-sm)',
                    }}
                  />
                </div>
                <span className="mono" style={{ width: 100, fontSize: 13, textAlign: 'right' }}>
                  {formatMoney(point.totalRevenue, 'SEK')}
                </span>
                <span className="mono" style={{ width: 70, fontSize: 12, color: 'var(--steam-400)' }}>
                  {point.orderCount} order{point.orderCount === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: 'var(--sp-4)' }}>Revenue per publisher</h2>
      {revenue && revenue.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No completed sales yet.</p>}
      {revenue && revenue.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {revenue.map((row) => (
            <div key={row.publisherId} className="panel-card row" style={{ justifyContent: 'space-between' }}>
              <span>{row.publisherEmail}</span>
              <span className="mono" style={{ color: 'var(--steam-400)' }}>{row.gamesSold} sold</span>
              <span className="mono" style={{ fontWeight: 600 }}>{formatMoney(row.totalRevenue, 'SEK')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
