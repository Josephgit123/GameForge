import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export function Profile() {
  const { user, logout } = useAuth();

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
