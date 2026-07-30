import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { ApiError } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';

export function PublisherSignup() {
  const { signup, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email, password, firstName, lastName, role: 'PUBLISHER' });
      navigate('/publisher/games', { replace: true });
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
      const user = await loginWithGoogle(idToken, true, 'PUBLISHER');
      if (user.role !== 'PUBLISHER') {
        logout();
        setError(`That Google account already has a ${user.role.toLowerCase()} account. Use the ${user.role.toLowerCase()} login instead.`);
        return;
      }
      navigate('/publisher/games', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 420 }}>
      <h1 style={{ marginBottom: 'var(--sp-2)', color: 'var(--teal)' }}>Publisher sign up</h1>
      <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-8)' }}>
        Creates your publisher account. Surfboard merchant onboarding (KYB) is a separate step your account will
        show as pending until it's completed.
      </p>
      <form onSubmit={onSubmit} className="stack" style={{ gap: 'var(--sp-4)' }}>
        {error && <div className="form-error-banner">{error}</div>}
        <div className="row" style={{ gap: 'var(--sp-4)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hint">At least 8 characters.</span>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <GoogleSignInButton onClick={onGoogleClick} submitting={googleSubmitting} label="Sign up with Google" />

      <p style={{ marginTop: 'var(--sp-6)', fontSize: 14, color: 'var(--steam-400)' }}>
        Already have an account? <Link to="/publisher/login">Log in</Link>
      </p>
    </div>
  );
}
