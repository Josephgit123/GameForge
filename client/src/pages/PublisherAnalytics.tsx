import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import { StatCard } from '../components/StatCard';
import { EmptyPlaceholder } from '../components/EmptyPlaceholder';
import { SkeletonLoader } from '../components/SkeletonLoader';
import type { PublisherGameRevenue, PublisherSalesPoint } from '../lib/types';

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-iron-700 bg-iron-900 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-steam-400">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="text-steam-100">
          {p.name}: {p.name === 'Revenue' ? formatMoney(p.value, 'SEK') : p.value}
        </div>
      ))}
    </div>
  );
}

export function PublisherAnalytics() {
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
      .catch(() => setError('Could not load analytics.'));
  }, [token]);

  const totalRevenue = byGame?.reduce((sum, g) => sum + g.totalRevenue, 0) ?? 0;
  const totalUnits = byGame?.reduce((sum, g) => sum + g.unitsSold, 0) ?? 0;
  const avgSaleValue = totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0;
  const recentSales = sales ? [...sales].reverse().slice(0, 6) : null;
  const loading = !sales || !byGame;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 font-display text-2xl font-bold text-steam-100">Analytics</h1>
      <p className="mb-8 text-sm text-steam-400">Sales performance across your published games.</p>

      {error && <div className="mb-6 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total revenue" value={formatMoney(totalRevenue, 'SEK')} accent="success" loading={loading} />
        <StatCard label="Games sold" value={String(totalUnits)} accent="teal" loading={loading} />
        <StatCard label="Avg. sale value" value={formatMoney(avgSaleValue, 'SEK')} accent="ember" loading={loading} />
        <StatCard label="Games with sales" value={byGame ? String(byGame.filter((g) => g.unitsSold > 0).length) : ''} accent="violet" loading={!byGame} />
      </div>
      <p className="-mt-6 mb-8 text-xs text-steam-600">
        "Orders" and "games sold" aren't tracked separately in the current API — figures above count items sold, since
        per-order grouping isn't exposed to publishers.
      </p>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-iron-700 bg-iron-900 p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Sales trend</h2>
          {!sales && <SkeletonLoader className="h-64 w-full" />}
          {sales && sales.length === 0 && <EmptyPlaceholder title="No sales yet" description="Your revenue trend will appear here once you have paid orders." />}
          {sales && sales.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sales}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ember)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--ember)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--iron-700)" />
                <XAxis dataKey="date" stroke="var(--steam-600)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--steam-600)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="totalRevenue" name="Revenue" stroke="var(--ember)" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-iron-700 p-5">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Payment success rate</h2>
          <EmptyPlaceholder
            notAvailable
            title="Not available"
            description="Publisher-scoped payment success/failure counts aren't exposed by the current API — only completed sales are visible here."
          />
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-iron-700 bg-iron-900 p-5">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Top selling games</h2>
          {!byGame && <SkeletonLoader className="h-40 w-full" />}
          {byGame && byGame.length === 0 && <EmptyPlaceholder title="No sales yet" />}
          {byGame && byGame.length > 0 && (
            <div className="space-y-1">
              {byGame.slice(0, 5).map((g, i) => (
                <div key={g.gameId} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-mono text-steam-600">{i + 1}</span>
                    <span className="text-steam-100">{g.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-steam-400">{g.unitsSold} sold</span>
                    <span className="font-mono font-semibold text-steam-100">{formatMoney(g.totalRevenue, 'SEK')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-iron-700 bg-iron-900 p-5">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Recent sales</h2>
          {!sales && <SkeletonLoader className="h-40 w-full" />}
          {sales && sales.length === 0 && <EmptyPlaceholder title="No sales yet" />}
          {recentSales && recentSales.length > 0 && (
            <div className="space-y-1">
              {recentSales.map((point) => (
                <div key={point.date} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-steam-400">{point.date}</span>
                  <span className="text-steam-100">{point.unitsSold} unit{point.unitsSold === 1 ? '' : 's'}</span>
                  <span className="font-mono font-semibold text-steam-100">{formatMoney(point.totalRevenue, 'SEK')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
