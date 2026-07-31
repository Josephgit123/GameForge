import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'gameforge-wishlist';

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface WishlistContextValue {
  gameIds: string[];
  toggleWishlist: (gameId: string) => void;
  removeFromWishlist: (gameId: string) => void;
  isWishlisted: (gameId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [gameIds, setGameIds] = useState<string[]>(readStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameIds));
  }, [gameIds]);

  function toggleWishlist(gameId: string) {
    setGameIds((ids) => (ids.includes(gameId) ? ids.filter((id) => id !== gameId) : [...ids, gameId]));
  }

  function removeFromWishlist(gameId: string) {
    setGameIds((ids) => ids.filter((id) => id !== gameId));
  }

  function isWishlisted(gameId: string) {
    return gameIds.includes(gameId);
  }

  return (
    <WishlistContext.Provider value={{ gameIds, toggleWishlist, removeFromWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
