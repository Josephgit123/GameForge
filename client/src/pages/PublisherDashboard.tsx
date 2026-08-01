import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatMoney } from '../lib/money';
import { StatCard } from '../components/StatCard';
import { EmptyPlaceholder } from '../components/EmptyPlaceholder';
import { SkeletonLoader } from '../components/SkeletonLoader';
import type { Game, PublisherGameRevenue, PublisherSalesPoint, PublisherStatusInfo } from '../lib/types';

function QuickAction({ label, description, onClick, icon }: { label: string; description: string; onClick: () => void; icon: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl border border-iron-700 bg-iron-900 p-5 text-left transition-colors hover:border-ember/50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember/15 text-ember">{icon}</span>
      <span className="font-display text-sm font-semibold text-steam-100">{label}</span>
      <span className="text-xs text-steam-400">{description}</span>
    </motion.button>
  );
}

export function PublisherDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<PublisherStatusInfo | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [byGame, setByGame] = useState<PublisherGameRevenue[] | null>(null);
  const [sales, setSales] = useState<PublisherSalesPoint[] | null>(null);

  useEffect(() => {
    api.get<{ publisher: PublisherStatusInfo }>('/auth/me/publisher', token).then((res) => setMerchant(res.publisher)).catch(() => {});
    api.get<{ games: Game[] }>('/games/mine/all', token).then((res) => setGames(res.games)).catch(() => {});
    api
      .get<{ games: PublisherGameRevenue[] }>('/analytics/publisher/by-game', token)
      .then((res) => setByGame(res.games))
      .catch(() => {});
    api
      .get<{ sales: PublisherSalesPoint[] }>('/analytics/publisher/sales', token)
      .then((res) => setSales(res.sales))
      .catch(() => {});
  }, [token]);

  const totalRevenue = byGame?.reduce((sum, g) => sum + g.totalRevenue, 0) ?? 0;
  const totalUnits = byGame?.reduce((sum, g) => sum + g.unitsSold, 0) ?? 0;
  const currency = games?.[0]?.currency ?? 'SEK';
  const recentSales = sales ? [...sales].reverse().slice(0, 5) : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-steam-100">Dashboard</h1>
        <p className="mt-1 text-sm text-steam-400">Welcome back, {user?.firstName}.</p>
      </div>

      {merchant && merchant.status !== 'APPROVED' && (
        <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Your publisher account is <strong>{merchant.status}</strong>
          {merchant.status === 'PENDING' && ' — an admin needs to approve you before you can publish games.'}
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Merchant status"
          value={merchant ? (merchant.merchantVerified ? 'Verified' : merchant.surfboardMerchantId ? 'Onboarding' : 'Not started') : ''}
          accent={merchant?.merchantVerified ? 'success' : 'violet'}
          loading={!merchant}
        />
        <StatCard
          label="Merchant ID"
          value={merchant?.surfboardMerchantId ?? '—'}
          accent="teal"
          loading={!merchant}
          sublabel={merchant?.storeName ?? undefined}
        />
        <StatCard label="Total games" value={games ? String(games.length) : ''} accent="ember" loading={!games} />
        <StatCard
          label="Published"
          value={games ? String(games.filter((g) => g.status === 'PUBLISHED').length) : ''}
          accent="ember"
          loading={!games}
        />
        <StatCard label="Total revenue" value={formatMoney(totalRevenue, currency)} accent="success" loading={!byGame} />
        <StatCard
          label="Units sold"
          value={byGame ? String(totalUnits) : ''}
          accent="teal"
          loading={!byGame}
          sublabel="Copies sold across all games"
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Quick actions</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <QuickAction
            label="Upload new game"
            description="Add a game to your catalog"
            onClick={() => navigate('/publisher/games', { state: { openForm: true } })}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          />
          <QuickAction
            label="View store"
            description="See your Surfboard store"
            onClick={() => navigate('/publisher/store')}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M3 9l1.5-5h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18" />
              </svg>
            }
          />
          <QuickAction
            label="Payment methods"
            description="Manage accepted payments"
            onClick={() => navigate('/publisher/store#payment-methods')}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            }
          />
          <QuickAction
            label="Open analytics"
            description="Sales trends & top games"
            onClick={() => navigate('/publisher/analytics')}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M4 19V9M12 19V5M20 19v-7" />
              </svg>
            }
          />
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Recent sales activity</h2>
        {!sales && (
          <div className="space-y-2">
            <SkeletonLoader className="h-14 w-full" />
            <SkeletonLoader className="h-14 w-full" />
          </div>
        )}
        {sales && sales.length === 0 && (
          <EmptyPlaceholder title="No sales yet" description="Once customers buy your games, activity will show up here." />
        )}
        {recentSales && recentSales.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-iron-700 bg-iron-900">
            {recentSales.map((point, i) => (
              <div
                key={point.date}
                className={`flex items-center justify-between px-5 py-3 ${i !== recentSales.length - 1 ? 'border-b border-iron-700' : ''}`}
              >
                <span className="text-sm text-steam-400">{point.date}</span>
                <span className="text-sm text-steam-100">
                  {point.unitsSold} unit{point.unitsSold === 1 ? '' : 's'} sold
                </span>
                <span className="font-mono text-sm font-semibold text-steam-100">{formatMoney(point.totalRevenue, currency)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-steam-600">
          Grouped by day (paid orders only) — see{' '}
          <Link to="/publisher/orders" className="text-ember hover:underline">
            Orders
          </Link>{' '}
          for individual order details.
        </p>
      </div>
    </div>
  );
}
