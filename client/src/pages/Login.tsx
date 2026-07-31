import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { ApiError } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';
import type { Role } from '../lib/types';

const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'customer',
  PUBLISHER: 'publisher',
  ADMIN: 'admin',
};

interface PortalLoginProps {
  role: Role;
  heading: string;
  accentClass: string;
  signupHref?: string;
}

export function PortalLogin({ role, heading, accentClass, signupHref }: PortalLoginProps) {
  const { login, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  function afterAuth(user: { role: Role }) {
    if (user.role !== role) {
      logout();
      setError(`That account is a ${ROLE_LABEL[user.role]} account. Use the ${ROLE_LABEL[role]} login instead.`);
      return;
    }
    navigate(from, { replace: true });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      afterAuth(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogleClick() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      const idToken = await signInWithGoogle();
      const user = await loginWithGoogle(idToken, role === 'CUSTOMER');
      afterAuth(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 404
            ? `No ${ROLE_LABEL[role]} account found for that Google email.`
            : err.message
        );
      } else {
        setError('Google sign-in failed. Try again.');
      }
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className={`mb-2 font-display text-2xl font-bold ${accentClass}`}>{heading}</h1>
      <p className="mb-8 text-steam-400">Log in to the {ROLE_LABEL[role]} portal.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-steam-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-steam-400">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-ember py-3 font-semibold text-iron-900 transition-colors hover:bg-[#ff6a43] disabled:opacity-50"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <GoogleSignInButton onClick={onGoogleClick} submitting={googleSubmitting} />

      {signupHref && (
        <p className="mt-6 text-sm text-steam-400">
          No account?{' '}
          <Link to={signupHref} className="text-ember hover:underline">
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}

export function CustomerLogin() {
  return <PortalLogin role="CUSTOMER" heading="Customer log in" accentClass="text-ember" signupHref="/signup" />;
}

export function PublisherLogin() {
  return (
    <PortalLogin role="PUBLISHER" heading="Publisher log in" accentClass="text-teal" signupHref="/publisher/signup" />
  );
}

export function AdminLogin() {
  return <PortalLogin role="ADMIN" heading="Admin log in" accentClass="text-violet" />;
}
