import { createContext, useContext, useEffect, useState } from 'react';

// Try to use Firebase Auth if configured, otherwise use local dev mode
let auth: any = null;
let signInWithEmailAndPassword: any = null;
let createUserWithEmailAndPassword: any = null;
let signOut: any = null;
let onAuthStateChanged: any = null;
let GoogleAuthProvider: any = null;
let signInWithPopup: any = null;
let sendPasswordResetEmail: any = null;
let sendEmailVerification: any = null;
let updateProfile: any = null;

const FIREBASE_CONFIGURED = !!import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your_firebase_api_key';

if (FIREBASE_CONFIGURED) {
  const firebaseAuth = await import('firebase/auth');
  const firebaseLib = await import('../lib/firebase');
  auth = firebaseLib.auth;
  signInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword;
  createUserWithEmailAndPassword = firebaseAuth.createUserWithEmailAndPassword;
  signOut = firebaseAuth.signOut;
  onAuthStateChanged = firebaseAuth.onAuthStateChanged;
  GoogleAuthProvider = firebaseAuth.GoogleAuthProvider;
  signInWithPopup = firebaseAuth.signInWithPopup;
  sendPasswordResetEmail = firebaseAuth.sendPasswordResetEmail;
  sendEmailVerification = firebaseAuth.sendEmailVerification;
  updateProfile = firebaseAuth.updateProfile;
}

// Local dev mock user
const DEV_USER = {
  uid: 'local-dev',
  email: 'dev@cma.local',
  displayName: 'Dev User',
  emailVerified: true,
  getIdToken: async () => 'dev-token'
} as any;

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (FIREBASE_CONFIGURED && auth && onAuthStateChanged) {
      const unsub = onAuthStateChanged(auth, (u: any) => { setUser(u); setLoading(false); });
      return unsub;
    } else {
      // Local dev mode: auto-login with mock user
      const savedUser = localStorage.getItem('cma_dev_user');
      if (savedUser) {
        setUser(DEV_USER);
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    if (FIREBASE_CONFIGURED && auth && signInWithEmailAndPassword) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      // Dev mode: accept any credentials
      localStorage.setItem('cma_dev_user', 'true');
      setUser({ ...DEV_USER, email, displayName: email.split('@')[0] });
    }
  };

  const register = async (email: string, password: string, name: string) => {
    if (FIREBASE_CONFIGURED && auth && createUserWithEmailAndPassword) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);
    } else {
      localStorage.setItem('cma_dev_user', 'true');
      setUser({ ...DEV_USER, email, displayName: name });
    }
  };

  const loginWithGoogle = async () => {
    if (FIREBASE_CONFIGURED && auth && GoogleAuthProvider && signInWithPopup) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      localStorage.setItem('cma_dev_user', 'true');
      setUser(DEV_USER);
    }
  };

  const logout = async () => {
    if (FIREBASE_CONFIGURED && auth && signOut) {
      await signOut(auth);
    } else {
      localStorage.removeItem('cma_dev_user');
      setUser(null);
    }
  };

  const resetPassword = async (email: string) => {
    if (FIREBASE_CONFIGURED && auth && sendPasswordResetEmail) {
      await sendPasswordResetEmail(auth, email);
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
