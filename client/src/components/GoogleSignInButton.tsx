import { isGoogleSignInEnabled } from '../lib/firebase';

interface GoogleSignInButtonProps {
  onClick: () => void;
  submitting: boolean;
  label?: string;
}

export function GoogleSignInButton({ onClick, submitting, label = 'Continue with Google' }: GoogleSignInButtonProps) {
  if (!isGoogleSignInEnabled) return null;

  return (
    <>
      <div className="row" style={{ alignItems: 'center', gap: 'var(--sp-3)', margin: 'var(--sp-5) 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--iron-700)' }} />
        <span style={{ fontSize: 12, color: 'var(--steam-400)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--iron-700)' }} />
      </div>
      <button type="button" className="btn btn-secondary btn-block" disabled={submitting} onClick={onClick}>
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" style={{ marginRight: 8 }}>
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.1 5.5 29.3 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.9-3.5Z"
          />
          <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.1 6.5 29.3 4.5 24 4.5c-8 0-14.9 4.5-18.4 11.2Z"
          />
          <path
            fill="#4CAF50"
            d="M24 44.5c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 36 26.8 37 24 37c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 40.6 16.2 44.5 24 44.5Z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.6 36.3 44.5 30.7 44.5 24c0-1.2-.1-2.4-.9-3.5Z"
          />
        </svg>
        {submitting ? 'Signing in…' : label}
      </button>
    </>
  );
}
