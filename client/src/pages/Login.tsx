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
  accent: string;
  signupHref?: string;
}

export function PortalLogin({ role, heading, accent, signupHref }: PortalLoginProps) {
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
    <div className="page" style={{ maxWidth: 420 }}>
      <h1 style={{ marginBottom: 'var(--sp-2)', color: accent }}>{heading}</h1>
      <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-8)' }}>
        Log in to the {ROLE_LABEL[role]} portal.
      </p>
      <form onSubmit={onSubmit} className="stack" style={{ gap: 'var(--sp-4)' }}>
        {error && <div className="form-error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <GoogleSignInButton onClick={onGoogleClick} submitting={googleSubmitting} />

      {signupHref && (
        <p style={{ marginTop: 'var(--sp-6)', fontSize: 14, color: 'var(--steam-400)' }}>
          No account? <Link to={signupHref}>Sign up</Link>
        </p>
      )}
    </div>
  );
}

export function CustomerLogin() {
  return <PortalLogin role="CUSTOMER" heading="Customer log in" accent="var(--ember)" signupHref="/signup" />;
}

export function PublisherLogin() {
  return (
    <PortalLogin role="PUBLISHER" heading="Publisher log in" accent="var(--teal)" signupHref="/publisher/signup" />
  );
}

export function AdminLogin() {
  return <PortalLogin role="ADMIN" heading="Admin log in" accent="var(--violet)" />;
}
