import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { AuthResponse, Role, User } from '../lib/types';

const TOKEN_KEY = 'gameforge-token';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: Extract<Role, 'CUSTOMER' | 'PUBLISHER'>;
    // Required by the backend only when role is PUBLISHER — needed for a
    // real Surfboard Create Merchant call.
    storeName?: string;
    corporateId?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
    phoneCode?: string;
    phoneNumber?: string;
  }) => Promise<AuthResponse>;
  loginWithGoogle: (
    idToken: string,
    allowSignup: boolean,
    role?: Extract<Role, 'CUSTOMER' | 'PUBLISHER'>
  ) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>('/auth/me', token)
      .then((res) => setUser(res.user))
      .catch(() => {
        // stored token is invalid/expired — clear it silently
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function persistSession(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function login(email: string, password: string) {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    return persistSession(res);
  }

  async function signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: Extract<Role, 'CUSTOMER' | 'PUBLISHER'>;
    storeName?: string;
    corporateId?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
    phoneCode?: string;
    phoneNumber?: string;
  }) {
    const res = await api.post<AuthResponse>('/auth/signup', data);
    persistSession(res);
    return res;
  }

  async function loginWithGoogle(
    idToken: string,
    allowSignup: boolean,
    role?: Extract<Role, 'CUSTOMER' | 'PUBLISHER'>
  ) {
    const res = await api.post<AuthResponse>('/auth/google', { idToken, allowSignup, role });
    return persistSession(res);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
