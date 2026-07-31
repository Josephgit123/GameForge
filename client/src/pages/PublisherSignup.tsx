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

  const [storeName, setStoreName] = useState('');
  const [corporateId, setCorporateId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryCode, setCountryCode] = useState('SE');
  const [phoneCode, setPhoneCode] = useState('46');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signup({
        email,
        password,
        firstName,
        lastName,
        role: 'PUBLISHER',
        storeName,
        corporateId,
        addressLine1,
        city,
        postalCode,
        countryCode,
        phoneCode,
        phoneNumber,
      });
      // Navigate with router state rather than rendering a confirmation
      // inline here — the moment signup succeeds, AuthContext's user
      // updates and Layout swaps to the publisher shell, remounting this
      // component and wiping any local state before it could be shown.
      // See PublisherOnboarding.tsx.
      navigate('/publisher/onboarding', { replace: true, state: { onboarding: res.surfboardOnboarding ?? null } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
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
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 font-display text-2xl font-bold text-teal">Publisher sign up</h1>
      <p className="mb-8 text-steam-400">
        Creates your publisher account and starts a real Surfboard merchant application. KYB verification is a
        separate step your account will show as pending until it's completed.
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

        <div className="pt-2">
          <h2 className="mb-1 text-sm font-semibold text-steam-100">Business details</h2>
          <p className="mb-3 text-xs text-steam-600">
            Sent to Surfboard to start your real merchant application — not stored anywhere but your account.
          </p>
        </div>
        <div>
          <label htmlFor="storeName" className="mb-1 block text-sm font-medium text-steam-400">
            Store / business name
          </label>
          <input
            id="storeName"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
          />
        </div>
        <div>
          <label htmlFor="corporateId" className="mb-1 block text-sm font-medium text-steam-400">
            Organisation / corporate ID
          </label>
          <input
            id="corporateId"
            required
            value={corporateId}
            onChange={(e) => setCorporateId(e.target.value)}
            className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
          />
        </div>
        <div>
          <label htmlFor="addressLine1" className="mb-1 block text-sm font-medium text-steam-400">
            Address
          </label>
          <input
            id="addressLine1"
            required
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="city" className="mb-1 block text-sm font-medium text-steam-400">
              City
            </label>
            <input
              id="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
            />
          </div>
          <div className="w-28">
            <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-steam-400">
              Postal code
            </label>
            <input
              id="postalCode"
              required
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
            />
          </div>
          <div className="w-20">
            <label htmlFor="countryCode" className="mb-1 block text-sm font-medium text-steam-400">
              Country
            </label>
            <input
              id="countryCode"
              required
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-24">
            <label htmlFor="phoneCode" className="mb-1 block text-sm font-medium text-steam-400">
              Phone code
            </label>
            <input
              id="phoneCode"
              required
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="phoneNumber" className="mb-1 block text-sm font-medium text-steam-400">
              Phone number
            </label>
            <input
              id="phoneNumber"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2.5 text-steam-100 outline-none focus:border-ember"
            />
          </div>
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
        <Link to="/publisher/login" className="text-ember hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
