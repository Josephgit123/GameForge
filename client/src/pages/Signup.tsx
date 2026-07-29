import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email, password, firstName, lastName });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 420 }}>
      <h1 style={{ marginBottom: 'var(--sp-2)' }}>Create your account</h1>
      <p style={{ color: 'var(--steam-400)', marginBottom: 'var(--sp-8)' }}>
        Publisher accounts are set up separately, after registering as a publisher.
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
      <p style={{ marginTop: 'var(--sp-6)', fontSize: 14, color: 'var(--steam-400)' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
