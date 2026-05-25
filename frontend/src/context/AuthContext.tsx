import { createContext, useContext, useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ── Token helpers ──────────────────────────────────────────────
const TOKEN_KEY = 'cma_auth_token';
const USER_KEY  = 'cma_auth_user';

const saveSession = (token: string, user: any) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('cma_use_offline_mode');
};

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

// ── API call helper ────────────────────────────────────────────
async function authFetch(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Types ──────────────────────────────────────────────────────
interface AuthUser {
  uid: string;       // maps to user.id
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  photoUrl?: string;
  role: string;
  createdAt: string;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Build user object from API response ────────────────────────
const buildUser = (apiUser: any, token: string): AuthUser => ({
  ...apiUser,
  uid: apiUser.id,     // keep uid alias for compatibility
  getIdToken: async () => token
});

// ── Provider ───────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const saved  = localStorage.getItem(USER_KEY);
    if (token && saved) {
      try {
        const u = JSON.parse(saved);
        setUser(buildUser(u, token));
        // Verify token is still valid in background
        fetch(`${BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => {
          if (!r.ok) { clearSession(); setUser(null); }
          else r.json().then(fresh => {
            const refreshed = buildUser(fresh, token);
            setUser(refreshed);
            localStorage.setItem(USER_KEY, JSON.stringify(fresh));
          });
        }).catch(() => {}); // offline – keep saved session
      } catch { clearSession(); }
    }
    setLoading(false);
  }, []);

  // ── Email / Password Login ──────────────────────────────────
  const login = async (email: string, password: string) => {
    const { token, user: u } = await authFetch('/auth/login', { email, password });
    saveSession(token, u);
    setUser(buildUser(u, token));
  };

  // ── Register ────────────────────────────────────────────────
  const register = async (email: string, password: string, name: string) => {
    const { token, user: u } = await authFetch('/auth/register', { email, password, name });
    saveSession(token, u);
    setUser(buildUser(u, token));
  };

  // ── Google Login (redirect to Google OAuth) ─────────────────
  const loginWithGoogle = async () => {
    // For now: show a friendly message that Google OAuth needs backend config
    alert(
      '🔑 Google Sign-In Setup Required\n\n' +
      'To enable Google login, your admin needs to configure Google OAuth in the backend.\n\n' +
      'For now, please use Email + Password to sign in.\n' +
      'You can register a new account if you don\'t have one.'
    );
  };

  // ── Logout ──────────────────────────────────────────────────
  const logout = async () => {
    clearSession();
    setUser(null);
  };

  // ── Reset Password (placeholder) ────────────────────────────
  const resetPassword = async (email: string) => {
    alert(`Password reset requested for ${email}.\nPlease contact your admin to reset your password.`);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
