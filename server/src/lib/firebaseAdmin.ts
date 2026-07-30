import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app: App | null | undefined;

// Lazily initialized so the server can boot without Firebase configured —
// the /auth/google route reports 503 instead of the process failing to start.
function getFirebaseApp(): App | null {
  if (app !== undefined) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    app = null;
    return app;
  }

  app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return app;
}

export class FirebaseNotConfiguredError extends Error {}

export async function verifyGoogleIdToken(idToken: string) {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    throw new FirebaseNotConfiguredError('Firebase is not configured on this server');
  }
  return getAuth(firebaseApp).verifyIdToken(idToken);
}
