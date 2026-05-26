import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

// ── Validate real credentials ──────────────────────────────────
const apiKey       = import.meta.env.VITE_FIREBASE_API_KEY || '';
const projectId    = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
const databaseURL  = import.meta.env.VITE_FIREBASE_DATABASE_URL || '';

export const isFirebaseConfigured =
  apiKey.length > 10 &&
  !apiKey.includes('your_') &&
  apiKey !== 'demo-api-key' &&
  projectId.length > 3 &&
  !projectId.includes('your_') &&
  projectId !== 'demo-project';

export const isRealtimeDBConfigured = isFirebaseConfigured && databaseURL.length > 10;

let app:  FirebaseApp | null = null;
let auth: Auth        | null = null;
let db:   Database    | null = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId:             import.meta.env.VITE_FIREBASE_APP_ID || '',
      databaseURL:       databaseURL || `https://${projectId}-default-rtdb.firebaseio.com`
    };

    app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);

    if (isRealtimeDBConfigured || projectId) {
      db = getDatabase(app);
    }
  } catch (e) {
    console.warn('Firebase init failed — offline mode active:', e);
    app = null; auth = null; db = null;
  }
} else {
  console.info('ℹ️ Firebase not configured — running offline (localStorage).');
}

export { app, auth, db };
export const isFirebaseReady   = () => auth !== null;
export const isRealtimeReady   = () => db   !== null;
export default app;
