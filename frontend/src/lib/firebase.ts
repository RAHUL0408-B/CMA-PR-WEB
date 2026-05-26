import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// ── Check if real Firebase credentials are provided ────────────
const apiKey    = import.meta.env.VITE_FIREBASE_API_KEY || '';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';

const isRealConfig =
  apiKey.length > 10 &&
  !apiKey.includes('your_') &&
  apiKey !== 'demo-api-key' &&
  projectId.length > 3 &&
  !projectId.includes('your_') &&
  projectId !== 'demo-project';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isRealConfig) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId:             import.meta.env.VITE_FIREBASE_APP_ID || ''
    };
    app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (e) {
    console.warn('Firebase init failed — running in offline mode:', e);
    app  = null;
    auth = null;
  }
} else {
  console.info('ℹ️ Firebase not configured — running in offline mode.');
}

export { app, auth };
export const isFirebaseReady = () => auth !== null;
export default app;
