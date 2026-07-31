import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isGoogleSignInEnabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

const app = isGoogleSignInEnabled ? initializeApp(config) : null;
const provider = new GoogleAuthProvider();
// Not always granted by default — request explicitly so the ID token's
// email claim is actually populated (confirmed missing without this).
// Fully-qualified scope URIs, not the bare 'email'/'profile' short names —
// the canonical form Firebase's own docs use for addScope().
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
// Google reuses a cached consent decision and won't re-show the permission
// screen just because we added a scope — force it so email actually gets
// granted (confirmed: without this, the ID token kept coming back with no
// email claim across repeated sign-in attempts).
provider.setCustomParameters({ prompt: 'consent select_account' });

export async function signInWithGoogle(): Promise<string> {
  if (!app) {
    throw new Error('Google sign-in is not configured');
  }
  const result = await signInWithPopup(getAuth(app), provider);
  return result.user.getIdToken();
}
