import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { ApiError } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';

export function Signup() {
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
      await signup({ email, password, firstName, lastName });
      navigate('/', { replace: true });
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
      const user = await loginWithGoogle(idToken, true, 'CUSTOMER');
      if (user.role !== 'CUSTOMER') {
        logout();
        setError(`That Google account already has a ${user.role.toLowerCase()} account. Use the ${user.role.toLowerCase()} login instead.`);
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 font-display text-2xl font-bold text-steam-100">Create your account</h1>
      <p className="mb-8 text-steam-400">
        Selling games instead?{' '}
        <Link to="/publisher/signup" className="text-ember hover:underline">
          Sign up as a publisher
        </Link>
        .
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-steam-400">
              First name
            </label>
            <input
              id="firstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-steam-400">
              Last name
            </label>
            <input
              id="lastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
            />
          </div>
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
          />
          <span className="mt-1 block text-xs text-steam-600">At least 8 characters.</span>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-ember py-3 font-semibold text-iron-900 transition-colors hover:bg-[#ff6a43] disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <GoogleSignInButton onClick={onGoogleClick} submitting={googleSubmitting} label="Sign up with Google" />

      <p className="mt-6 text-sm text-steam-400">
        Already have an account?{' '}
        <Link to="/login" className="text-ember hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
