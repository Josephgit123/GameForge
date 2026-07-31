import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'gameforge-cart';

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface CartContextValue {
  gameIds: string[];
  addToCart: (gameId: string) => void;
  removeFromCart: (gameId: string) => void;
  clearCart: () => void;
  isInCart: (gameId: string) => boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [gameIds, setGameIds] = useState<string[]>(readStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameIds));
  }, [gameIds]);

  function addToCart(gameId: string) {
    setGameIds((ids) => (ids.includes(gameId) ? ids : [...ids, gameId]));
  }

  function removeFromCart(gameId: string) {
    setGameIds((ids) => ids.filter((id) => id !== gameId));
  }

  function clearCart() {
    setGameIds([]);
  }

  function isInCart(gameId: string) {
    return gameIds.includes(gameId);
  }

  return (
    <CartContext.Provider value={{ gameIds, addToCart, removeFromCart, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
