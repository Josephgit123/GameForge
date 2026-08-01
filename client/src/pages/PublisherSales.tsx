import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import type { PublisherGameRevenue, PublisherSalesPoint } from '../lib/types';

export function PublisherSales() {
  const { token } = useAuth();
  const [sales, setSales] = useState<PublisherSalesPoint[] | null>(null);
  const [byGame, setByGame] = useState<PublisherGameRevenue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ sales: PublisherSalesPoint[] }>('/analytics/publisher/sales', token),
      api.get<{ games: PublisherGameRevenue[] }>('/analytics/publisher/by-game', token),
    ])
      .then(([salesRes, gamesRes]) => {
        setSales(salesRes.sales);
        setByGame(gamesRes.games);
      })
      .catch(() => setError('Could not load your sales data.'));
  }, [token]);

  const maxRevenue = sales ? Math.max(...sales.map((s) => s.totalRevenue), 1) : 1;
  const totalRevenue = byGame?.reduce((sum, g) => sum + g.totalRevenue, 0) ?? 0;
  const totalUnits = byGame?.reduce((sum, g) => sum + g.unitsSold, 0) ?? 0;

  return (
    <div className="page">
      <h1 style={{ marginBottom: 'var(--sp-8)' }}>View sales</h1>
      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--sp-6)' }}>{error}</div>}

      {byGame && (
        <div className="row" style={{ gap: 'var(--sp-4)', marginBottom: 'var(--sp-8)' }}>
          <div className="panel-card" style={{ flex: 1 }}>
            <span style={{ fontSize: 15, color: 'var(--steam-400)' }}>Total revenue</span>
            <div className="mono" style={{ fontSize: 26, fontWeight: 600 }}>{formatMoney(totalRevenue, 'SEK')}</div>
          </div>
          <div className="panel-card" style={{ flex: 1 }}>
            <span style={{ fontSize: 15, color: 'var(--steam-400)' }}>Units sold</span>
            <div className="mono" style={{ fontSize: 26, fontWeight: 600 }}>{totalUnits}</div>
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: 'var(--sp-4)' }}>Sales over time</h2>
      {sales && sales.length === 0 && (
        <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-8)' }}>No completed sales yet.</p>
      )}
      {sales && sales.length > 0 && (
        <div className="panel-card" style={{ marginBottom: 'var(--sp-8)' }}>
          <div className="stack" style={{ gap: 'var(--sp-3)' }}>
            {sales.map((point) => (
              <div key={point.date} className="row" style={{ gap: 'var(--sp-4)', alignItems: 'center' }}>
                <span className="mono" style={{ width: 100, fontSize: 14, color: 'var(--steam-400)' }}>
                  {point.date}
                </span>
                <div style={{ flex: 1, background: 'var(--iron-800)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(point.totalRevenue / maxRevenue) * 100}%`,
                      background: 'var(--teal)',
                      height: 20,
                      minWidth: 4,
                      borderRadius: 'var(--r-sm)',
                    }}
                  />
                </div>
                <span className="mono" style={{ width: 100, fontSize: 15, textAlign: 'right' }}>
                  {formatMoney(point.totalRevenue, 'SEK')}
                </span>
                <span className="mono" style={{ width: 80, fontSize: 14, color: 'var(--steam-400)' }}>
                  {point.unitsSold} unit{point.unitsSold === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: 'var(--sp-4)' }}>Revenue by product</h2>
      {byGame && byGame.length === 0 && <p style={{ color: 'var(--steam-400)' }}>No completed sales yet.</p>}
      {byGame && byGame.length > 0 && (
        <div className="stack" style={{ gap: 'var(--sp-3)' }}>
          {byGame.map((row) => (
            <div key={row.gameId} className="panel-card row" style={{ justifyContent: 'space-between' }}>
              <span>{row.title}</span>
              <span className="mono" style={{ color: 'var(--steam-400)' }}>{row.unitsSold} sold</span>
              <span className="mono" style={{ fontWeight: 600 }}>{formatMoney(row.totalRevenue, 'SEK')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
