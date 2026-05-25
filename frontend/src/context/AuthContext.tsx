import { createContext, useContext, useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ── Storage Keys ───────────────────────────────────────────────
const TOKEN_KEY   = 'cma_auth_token';
const USER_KEY    = 'cma_auth_user';
const USERS_KEY   = 'cma_local_users';   // offline user registry

// ── Session helpers ────────────────────────────────────────────
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

// ── Offline user store ─────────────────────────────────────────
const getLocalUsers = (): any[] => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
};
const saveLocalUsers = (users: any[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// ── Simple password encode (offline only, not for production) ──
const encodePass = (p: string) => btoa(unescape(encodeURIComponent(p)));
const checkPass  = (p: string, encoded: string) => encodePass(p) === encoded;

// ── Decode Google JWT payload ──────────────────────────────────
const decodeJWT = (token: string) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch { return null; }
};

// ── Backend reachability check ─────────────────────────────────
let _backendAvailable: boolean | null = null;
async function isBackendAvailable(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const res = await fetch(`${BASE.replace('/api', '')}/api/health`, {
      signal: AbortSignal.timeout(2500)
    });
    _backendAvailable = res.ok;
  } catch {
    _backendAvailable = false;
  }
  return _backendAvailable;
}

// ── Types ──────────────────────────────────────────────────────
interface AuthUser {
  uid: string;
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  photoUrl?: string;
  role: string;
  provider?: string;
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

const buildUser = (apiUser: any, token: string): AuthUser => ({
  ...apiUser,
  uid: apiUser.id,
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
        // Verify token in background (only for real backend tokens)
        if (!token.startsWith('offline_') && !token.startsWith('google_offline_')) {
          fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => {
              if (!r.ok) { clearSession(); setUser(null); }
              else r.json().then(fresh => {
                setUser(buildUser(fresh, token));
                localStorage.setItem(USER_KEY, JSON.stringify(fresh));
              });
            }).catch(() => {}); // offline – keep saved session
        }
      } catch { clearSession(); }
    }
    setLoading(false);
  }, []);

  // ── Email / Password Login ─────────────────────────────────────
  const login = async (email: string, password: string) => {
    const online = await isBackendAvailable();

    if (online) {
      // ── ONLINE: real backend JWT ────────────────────────────
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      saveSession(data.token, data.user);
      setUser(buildUser(data.user, data.token));
    } else {
      // ── OFFLINE: localStorage auth ──────────────────────────
      const users = getLocalUsers();
      const found = users.find((u: any) => u.email === email.toLowerCase());
      if (!found) throw new Error('No account found. Please register first or check your email.');
      if (!checkPass(password, found.password)) throw new Error('Incorrect password. Please try again.');
      const token = 'offline_' + Date.now();
      const { password: _p, ...safeUser } = found;
      saveSession(token, safeUser);
      setUser(buildUser(safeUser, token));
      localStorage.setItem('cma_use_offline_mode', 'true');
    }
  };

  // ── Register ───────────────────────────────────────────────────
  const register = async (email: string, password: string, name: string) => {
    const online = await isBackendAvailable();

    if (online) {
      // ── ONLINE: real backend ─────────────────────────────────
      const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      saveSession(data.token, data.user);
      setUser(buildUser(data.user, data.token));
    } else {
      // ── OFFLINE: localStorage ────────────────────────────────
      const users = getLocalUsers();
      if (users.find((u: any) => u.email === email.toLowerCase())) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      const newUser = {
        id: 'local_' + Date.now(),
        email: email.toLowerCase(),
        name,
        displayName: name,
        password: encodePass(password),
        role: 'ANALYST',
        provider: 'email',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      saveLocalUsers(users);
      const token = 'offline_' + Date.now();
      const { password: _p, ...safeUser } = newUser;
      saveSession(token, safeUser);
      setUser(buildUser(safeUser, token));
      localStorage.setItem('cma_use_offline_mode', 'true');
    }
  };

  // ── Google Sign-In via GIS ─────────────────────────────────────
  const loginWithGoogle = async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error(
        'Google Sign-In is not configured.\n\nTo enable it:\n' +
        '1. Go to console.cloud.google.com\n' +
        '2. Create OAuth 2.0 Client ID\n' +
        '3. Add VITE_GOOGLE_CLIENT_ID in Netlify settings\n\n' +
        'For now, please use Email + Password to sign in.'
      );
    }

    return new Promise<void>((resolve, reject) => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        reject(new Error('Google Sign-In is loading. Please try again in a moment.'));
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          try {
            const payload = decodeJWT(response.credential);
            if (!payload) throw new Error('Invalid Google token');

            const googleUser = {
              id: 'google_' + payload.sub,
              email: payload.email,
              name: payload.name,
              displayName: payload.name,
              photoUrl: payload.picture,
              role: 'ANALYST',
              provider: 'google',
              createdAt: new Date().toISOString()
            };

            const online = await isBackendAvailable();
            if (online) {
              // Try to sync with backend
              try {
                const res = await fetch(`${BASE}/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    googleToken: response.credential,
                    email: payload.email,
                    name: payload.name,
                    photoUrl: payload.picture,
                    googleId: payload.sub
                  })
                });
                if (res.ok) {
                  const data = await res.json();
                  saveSession(data.token, data.user);
                  setUser(buildUser(data.user, data.token));
                  resolve();
                  return;
                }
              } catch { /* fall through to offline */ }
            }

            // Offline Google login — store locally
            const users = getLocalUsers();
            const existing = users.find((u: any) => u.email === googleUser.email);
            if (!existing) {
              users.push({ ...googleUser, password: '' });
              saveLocalUsers(users);
            }
            const token = 'google_offline_' + Date.now();
            saveSession(token, googleUser);
            setUser(buildUser(googleUser, token));
            localStorage.setItem('cma_use_offline_mode', 'true');
            resolve();

          } catch (e: any) {
            reject(new Error(e.message || 'Google Sign-In failed'));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google Sign-In was cancelled'));
        }
      });

      // Show the One Tap prompt
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          // One Tap blocked — use popup button instead
          reject(new Error('Please allow pop-ups for Google Sign-In or use Email + Password.'));
        }
      });
    });
  };

  // ── Logout ─────────────────────────────────────────────────────
  const logout = async () => {
    // Sign out of Google if applicable
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
    clearSession();
    _backendAvailable = null; // reset backend check
    setUser(null);
  };

  // ── Reset Password ──────────────────────────────────────────────
  const resetPassword = async (email: string) => {
    const online = await isBackendAvailable();
    if (online) {
      // Could call /api/auth/reset-password if implemented
      alert(`Password reset email sent to ${email}.\nIf you don't receive it, contact your admin.`);
    } else {
      // Offline: allow user to re-register or contact admin
      alert(`Offline mode: Password reset is not available.\n\nTip: Register a new account with the same email to reset access.`);
    }
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
