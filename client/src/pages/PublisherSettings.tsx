import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { api } from '../lib/api';
import type { PublisherStatusInfo } from '../lib/types';

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6 rounded-2xl border border-iron-700 bg-iron-900 p-6">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">{title}</h2>
      {children}
    </div>
  );
}

export function PublisherSettings() {
  const { user, token, logout } = useAuth();
  const [merchant, setMerchant] = useState<PublisherStatusInfo | null>(null);

  useEffect(() => {
    api
      .get<{ publisher: PublisherStatusInfo }>('/auth/me/publisher', token)
      .then((res) => setMerchant(res.publisher))
      .catch(() => {});
  }, [token]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-8 font-display text-2xl font-bold text-steam-100">Settings</h1>

      <SettingsSection title="Publisher profile">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-iron-800 font-display text-xl font-semibold text-steam-100">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <div className="font-display text-lg font-semibold text-steam-100">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-steam-400">{user.email}</div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Merchant information">
        {merchant ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-steam-400">Publisher status</span>
              <span className="text-steam-100">{merchant.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steam-400">Merchant ID</span>
              <span className="font-mono text-steam-100">{merchant.surfboardMerchantId ?? 'Not yet issued'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steam-400">Store</span>
              <span className="text-steam-100">{merchant.storeName ?? '—'}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-steam-400">Loading…</p>
        )}
      </SettingsSection>

      <SettingsSection title="Password">
        <p className="text-sm text-steam-400">
          Changing your password isn't available yet — this account currently has no password-change endpoint.
        </p>
        <button type="button" disabled className="mt-3 cursor-not-allowed rounded-md border border-iron-700 px-4 py-2 text-sm text-steam-600">
          Change password
        </button>
      </SettingsSection>

      <SettingsSection title="Notification preferences">
        <p className="text-sm text-steam-400">Coming soon — notification settings aren't stored by the backend yet.</p>
        <div className="mt-3 flex items-center justify-between opacity-50">
          <span className="text-sm text-steam-100">Email me about new orders</span>
          <div className="h-6 w-11 rounded-full bg-iron-800" />
        </div>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-steam-100">Theme</div>
            <div className="text-sm text-steam-400">Switch between light and dark theme.</div>
          </div>
          <ThemeToggle />
        </div>
      </SettingsSection>

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
