import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { api, ApiError } from '../lib/api';
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [savingNotify, setSavingNotify] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ publisher: PublisherStatusInfo }>('/auth/me/publisher', token)
      .then((res) => setMerchant(res.publisher))
      .catch(() => {});
  }, [token]);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/me/password', { currentPassword, newPassword }, token);
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function onToggleNotify() {
    if (!merchant) return;
    setNotifyError(null);
    setSavingNotify(true);
    const next = !merchant.notifyOnNewOrder;
    try {
      await api.patch('/auth/me/publisher/notifications', { notifyOnNewOrder: next }, token);
      setMerchant({ ...merchant, notifyOnNewOrder: next });
    } catch (err) {
      setNotifyError(err instanceof ApiError ? err.message : 'Could not save preference.');
    } finally {
      setSavingNotify(false);
    }
  }

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
        <form onSubmit={onChangePassword} className="space-y-3">
          {passwordError && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{passwordError}</div>}
          {passwordSaved && <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Password changed.</div>}
          <div>
            <label className="mb-1 block text-xs font-medium text-steam-400">Current password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none focus:border-ember"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-steam-400">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none focus:border-ember"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-steam-400">Confirm new password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none focus:border-ember"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-md border border-iron-700 px-4 py-2 text-sm font-semibold text-steam-100 hover:bg-iron-800 disabled:opacity-50"
          >
            {savingPassword ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </SettingsSection>

      <SettingsSection title="Notification preferences">
        <p className="mb-3 text-xs text-steam-600">
          This preference is saved for real, but no notification actually gets sent yet — this project has no email
          service wired up.
        </p>
        {notifyError && <div className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{notifyError}</div>}
        <div className="flex items-center justify-between">
          <span className="text-sm text-steam-100">Email me about new orders</span>
          <button
            type="button"
            role="switch"
            aria-checked={merchant?.notifyOnNewOrder ?? false}
            disabled={!merchant || savingNotify}
            onClick={onToggleNotify}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
              merchant?.notifyOnNewOrder ? 'bg-ember' : 'bg-iron-800'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                merchant?.notifyOnNewOrder ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
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
