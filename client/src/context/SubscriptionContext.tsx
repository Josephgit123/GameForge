import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import type { Subscription } from '../lib/types';

// Shared GameForge+ subscription state, mirroring CartContext/WishlistContext.
// Wraps the same GET /subscriptions/mine call Subscribe.tsx/Profile.tsx/
// Checkout.tsx already each fetch on their own — this is an ADDITIONAL
// shared source for new consumers (Navbar badge, early-access locks,
// storefront member sections) so they don't duplicate that fetch, without
// touching those existing pages' own working fetches.
interface SubscriptionContextValue {
  subscription: Subscription | null;
  isActiveMember: boolean;
  loading: boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    if (user?.role !== 'CUSTOMER') {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<{ subscription: Subscription | null }>('/subscriptions/mine', token)
      .then((res) => setSubscription(res.subscription))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [user, token]);

  const isActiveMember = subscription?.status === 'ACTIVE';

  return (
    <SubscriptionContext.Provider value={{ subscription, isActiveMember, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
