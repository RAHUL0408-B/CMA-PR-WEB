import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseReady } from '../lib/firebase';

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

// ── Firebase user → AuthUser ────────────────────────────────────
const toAuthUser = (fbUser: FirebaseUser): AuthUser => ({
  uid: fbUser.uid,
  id: fbUser.uid,
  email: fbUser.email || '',
  name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
  displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
  photoUrl: fbUser.photoURL || undefined,
  role: 'ANALYST',
  provider: fbUser.providerData[0]?.providerId || 'email',
  createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
  getIdToken: () => fbUser.getIdToken()
});

// ── Offline storage helpers ────────────────────────────────────
const USERS_KEY = 'cma_local_users';
const TOKEN_KEY = 'cma_auth_token';
const USER_KEY  = 'cma_auth_user';

const getLocalUsers = (): any[] => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
};
const saveLocalUsers = (u: any[]) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
const encodePass = (p: string) => btoa(unescape(encodeURIComponent(p)));
const checkPass  = (p: string, e: string) => encodePass(p) === e;

const buildOfflineUser = (data: any): AuthUser => ({
  uid: data.id,
  id: data.id,
  email: data.email,
  name: data.name,
  displayName: data.name,
  photoUrl: data.photoUrl,
  role: 'ANALYST',
  provider: data.provider || 'email',
  createdAt: data.createdAt || new Date().toISOString(),
  getIdToken: async () => 'offline_token'
});

// ── Provider ───────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseReady() && auth) {
      // Firebase is configured — listen to real auth state
      const unsub = onAuthStateChanged(auth, (fbUser) => {
        setUser(fbUser ? toAuthUser(fbUser) : null);
        setLoading(false);
      });
      return unsub;
    } else {
      // Offline mode — restore from localStorage
      try {
        const saved = localStorage.getItem(USER_KEY);
        const token = localStorage.getItem(TOKEN_KEY);
        if (saved && token) setUser(buildOfflineUser(JSON.parse(saved)));
      } catch { /* ignore */ }
      setLoading(false);
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    if (isFirebaseReady() && auth) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      // Offline login
      const users = getLocalUsers();
      const found = users.find((u: any) => u.email === email.toLowerCase());
      if (!found) throw new Error('No account found. Please register first.');
      if (!checkPass(password, found.password)) throw new Error('Incorrect password. Try again.');
      const { password: _p, ...safe } = found;
      localStorage.setItem(USER_KEY, JSON.stringify(safe));
      localStorage.setItem(TOKEN_KEY, 'offline_' + Date.now());
      localStorage.setItem('cma_use_offline_mode', 'true');
      setUser(buildOfflineUser(safe));
    }
  };

  // ── Register ────────────────────────────────────────────────────
  const register = async (email: string, password: string, name: string) => {
    if (isFirebaseReady() && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
    } else {
      // Offline register
      const users = getLocalUsers();
      if (users.find((u: any) => u.email === email.toLowerCase())) {
        throw new Error('Email already registered. Please sign in.');
      }
      const newUser = {
        id: 'local_' + Date.now(),
        email: email.toLowerCase(),
        name,
        password: encodePass(password),
        provider: 'email',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      saveLocalUsers(users);
      const { password: _p, ...safe } = newUser;
      localStorage.setItem(USER_KEY, JSON.stringify(safe));
      localStorage.setItem(TOKEN_KEY, 'offline_' + Date.now());
      localStorage.setItem('cma_use_offline_mode', 'true');
      setUser(buildOfflineUser(safe));
    }
  };

  // ── Google Sign-In ──────────────────────────────────────────────
  const loginWithGoogle = async () => {
    if (isFirebaseReady() && auth) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } else {
      throw new Error(
        'Google Sign-In needs Firebase setup.\n\n' +
        'Steps:\n' +
        '1. Go to console.firebase.google.com\n' +
        '2. Create project → Enable Google Auth\n' +
        '3. Add Firebase keys to Netlify env vars\n' +
        '4. Redeploy Netlify\n\n' +
        'For now use Email + Password ✅'
      );
    }
  };

  // ── Logout ──────────────────────────────────────────────────────
  const logout = async () => {
    if (isFirebaseReady() && auth) {
      await signOut(auth);
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('cma_use_offline_mode');
    setUser(null);
  };

  // ── Reset Password ──────────────────────────────────────────────
  const resetPassword = async (email: string) => {
    if (isFirebaseReady() && auth) {
      await sendPasswordResetEmail(auth, email);
      alert(`✅ Password reset email sent to ${email}. Check your inbox.`);
    } else {
      alert('Offline mode: Contact your admin to reset your password.');
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
